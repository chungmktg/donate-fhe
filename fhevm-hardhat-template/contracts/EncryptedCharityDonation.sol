// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint128, externalEuint128, eaddress } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract EncryptedCharityDonation is SepoliaConfig {
    euint128 private _totalDonations; // Encrypted total donations (in wei)
    mapping(address => euint128) private _donorBalances; // Encrypted donation balance per donor
    mapping(address => eaddress) private _encryptedDonorAddresses; // Encrypted donor addresses
    mapping(uint256 => address) private _pendingWithdrawals; // Maps decryption request ID to withdrawer
    address public immutable charityOwner; // Charity admin address (can withdraw funds)

    event Donation(address indexed donor, euint128 amount); // Event for encrypted donations
    event WithdrawalRequested(address indexed charity, euint128 amount); // Event for withdrawal requests
    event Withdrawn(address indexed charity, uint128 amount); // Event for completed withdrawals

    constructor(address _charityOwner) {
        require(_charityOwner != address(0), "Invalid charity owner address");
        charityOwner = _charityOwner;
        _totalDonations = FHE.asEuint128(0);
        
        // Allow access to encrypted total donations
        FHE.allowThis(_totalDonations);
        FHE.allow(_totalDonations, charityOwner);
    }

    /// @notice Get the encrypted total donations
    /// @return Encrypted total donation amount
    function totalDonations() external view returns (euint128) {
        return _totalDonations;
    }

    /// @notice Get the encrypted balance of a donor
    /// @param donor Address to query
    /// @return Encrypted donation balance
    function balanceOf(address donor) external view returns (euint128) {
        return _donorBalances[donor];
    }

    /// @notice Donate Ether to the charity, encrypting the amount and donor address
    function donate(
        externalEuint128 encryptedAmount,
        bytes calldata amountProof
    ) external payable {
        // Check for non-zero donation and euint128 limit
        require(msg.value > 0, "Donation amount must be greater than zero");
        require(msg.value <= type(uint128).max, "Donation amount exceeds euint128 limit");

        // Encrypt the donated amount (in wei)
        euint128 amount = FHE.fromExternal(encryptedAmount, amountProof);
        
        // Encrypt the donor's address
        eaddress encryptedDonor = FHE.asEaddress(msg.sender);
        
        // Update total donations and donor's balance
        _totalDonations = FHE.add(_totalDonations, amount);
        _donorBalances[msg.sender] = FHE.add(_donorBalances[msg.sender], amount);
        _encryptedDonorAddresses[msg.sender] = encryptedDonor;

        // Allow access to updated encrypted variables
        FHE.allowThis(_totalDonations);
        FHE.allow(_totalDonations, charityOwner);
        FHE.allowThis(_donorBalances[msg.sender]);
        FHE.allow(_donorBalances[msg.sender], msg.sender);
        FHE.allowThis(_encryptedDonorAddresses[msg.sender]);
        FHE.allow(_encryptedDonorAddresses[msg.sender], msg.sender);

        // Emit donation event
        emit Donation(msg.sender, amount);
    }

    /// @notice Request withdrawal of encrypted funds (only charity owner)
    function requestWithdrawal() external {
        require(msg.sender == charityOwner, "Only charity owner can withdraw");
        euint128 amount = _totalDonations;

        // Reset total donations
        _totalDonations = FHE.asEuint128(0);

        // Allow access to updated encrypted total
        FHE.allowThis(_totalDonations);
        FHE.allow(_totalDonations, charityOwner);

        // Prepare ciphertext for decryption
        bytes32[] memory cts = new bytes32[](1);
        cts[0] = FHE.toBytes32(amount);

        // Request decryption and store withdrawer
        uint256 requestId = FHE.requestDecryption(cts, this.callbackWithdrawal.selector);
        _pendingWithdrawals[requestId] = msg.sender;

        // Emit withdrawal request event
        emit WithdrawalRequested(msg.sender, amount);
    }

    /// @notice Callback for withdrawal decryption, sends decrypted Ether to charity owner
    /// @param requestId Request ID
    /// @param cleartexts Decrypted cleartexts
    /// @param decryptionProof Decryption proof
    function callbackWithdrawal(uint256 requestId, bytes memory cleartexts, bytes memory decryptionProof) external {
        // Verify signatures and proof
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        // Decode decrypted amount (in wei)
        uint128 decryptedAmount = abi.decode(cleartexts, (uint128));

        // Get withdrawer and clear pending
        address withdrawer = _pendingWithdrawals[requestId];
        delete _pendingWithdrawals[requestId];

        // Ensure withdrawer is valid
        require(withdrawer != address(0), "Invalid request ID");
        require(withdrawer == charityOwner, "Only charity owner can withdraw");

        // Check contract has enough Ether
        require(address(this).balance >= decryptedAmount, "Insufficient contract balance");

        // Transfer Ether to charity owner
        payable(withdrawer).transfer(decryptedAmount);

        // Emit completed withdrawal event
        emit Withdrawn(withdrawer, decryptedAmount);
    }

    /// @notice Cancel a pending withdrawal request (only charity owner)
    function cancelPendingWithdrawal(uint256 requestId) external {
        require(msg.sender == charityOwner, "Only charity owner can cancel");
        address withdrawer = _pendingWithdrawals[requestId];
        require(withdrawer != address(0), "No pending withdrawal");
        delete _pendingWithdrawals[requestId];
    }
}