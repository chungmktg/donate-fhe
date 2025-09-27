
"use client";

import { useFhevm } from "../fhevm/useFhevm"; // Adjust path
import { useInMemoryStorage } from "../hooks/useInMemoryStorage"; // Adjust path
import { useMetaMaskEthersSigner } from "../hooks/metamask/useMetaMaskEthersSigner"; // Adjust path
import { useEncryptedCharityDonation } from "@/hooks/useEncryptedCharityDonation"; // Adjust path to the new hook
import { errorNotDeployed } from "./ErrorNotDeployed"; // Assume you have this
import { useState } from "react";
import { ethers } from "ethers";

export const EncryptedCharityDonationDemo = () => {
  const { storage: fhevmDecryptionSignatureStorage } = useInMemoryStorage();
  const {
    provider,
    chainId,
    accounts,
    isConnected,
    connect,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
    initialMockChains,
  } = useMetaMaskEthersSigner();

  const {
    instance: fhevmInstance,
    status: fhevmStatus,
    error: fhevmError,
  } = useFhevm({
    provider,
    chainId,
    initialMockChains,
    enabled: true,
  });

  const encryptedCharityDonation = useEncryptedCharityDonation({
    instance: fhevmInstance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider: provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  });

  const [donationAmount, setDonationAmount] = useState<number>(1000000000000000); // Default 0.001 ETH in wei

  const buttonClass =
    "inline-flex items-center justify-center rounded-xl bg-black px-4 py-4 font-semibold text-white shadow-sm " +
    "transition-colors duration-200 hover:bg-blue-700 active:bg-blue-800 " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 " +
    "disabled:opacity-50 disabled:pointer-events-none";

  const titleClass = "font-semibold text-black text-lg mt-4";

  if (!isConnected) {
    return (
      <div className="mx-auto">
        <button className={buttonClass} disabled={isConnected} onClick={connect}>
          <span className="text-4xl p-6">Connect to MetaMask</span>
        </button>
      </div>
    );
  }

  if (encryptedCharityDonation.isDeployed === false) {
    return errorNotDeployed(chainId);
  }

  return (
    <div className="grid w-full gap-4">
      <div className="col-span-full mx-20 bg-black text-white">
        <p className="font-semibold text-3xl m-5">
          FHEVM React Minimal Template -{" "}
          <span className="font-mono font-normal text-gray-400">EncryptedCharityDonation.sol</span>
        </p>
      </div>
      <div className="col-span-full mx-20 mt-4 px-5 pb-4 rounded-lg bg-white border-2 border-black">
        <p className={titleClass}>Chain Infos</p>
        {printProperty("ChainId", chainId)}
        {printProperty(
          "Metamask accounts",
          accounts
            ? accounts.length === 0
              ? "No accounts"
              : `{ length: ${accounts.length}, [${accounts[0]}, ...] }`
            : "undefined",
        )}
        {printProperty("Signer", ethersSigner ? ethersSigner.address : "No signer")}
        {printProperty("EncryptedCharityDonation", encryptedCharityDonation.contractAddress)}
        {printProperty("isDeployed", encryptedCharityDonation.isDeployed)}
      </div>
      <div className="col-span-full mx-20">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-white border-2 border-black pb-4 px-4">
            <p className={titleClass}>FHEVM instance</p>
            {printProperty("Fhevm Instance", fhevmInstance ? "OK" : "undefined")}
            {printProperty("Fhevm Status", fhevmStatus)}
            {printProperty("Fhevm Error", fhevmError ?? "No Error")}
          </div>
          <div className="rounded-lg bg-white border-2 border-black pb-4 px-4">
            <p className={titleClass}>Status</p>
            {printProperty("isRefreshing", encryptedCharityDonation.isRefreshing)}
            {printProperty("isDonating", encryptedCharityDonation.isDonating)}
            {printProperty("isWithdrawing", encryptedCharityDonation.isWithdrawing)}
            {printProperty("canGetState", encryptedCharityDonation.canGetState)}
            {printProperty("canDonate", encryptedCharityDonation.canDonate)}
            {printProperty("canWithdraw", encryptedCharityDonation.canWithdraw)}
            {printProperty("isOwner", encryptedCharityDonation.isOwner)}
          </div>
        </div>
      </div>
      <div className="col-span-full mx-20 px-4 pb-4 rounded-lg bg-white border-2 border-black">
        <p className={titleClass}>State</p>
        {printProperty("Has Donated", encryptedCharityDonation.hasDonated)}
        {printProperty("Encrypted Donation", encryptedCharityDonation.encryptedDonation || "N/A")}
        {printProperty("Encrypted Total Donations", encryptedCharityDonation.encryptedTotalDonations || "N/A")}
        {printProperty("Current Timestamp", encryptedCharityDonation.currentTimestamp)}
      </div>
      <div className="grid grid-cols-3 mx-20 gap-4">
        <button
          className={buttonClass}
          disabled={!encryptedCharityDonation.canGetState}
          onClick={encryptedCharityDonation.refreshState}
        >
          {encryptedCharityDonation.canGetState ? "Refresh State" : "EncryptedCharityDonation is not available"}
        </button>
        <div>
          <input
            type="number"
            placeholder="Donation Amount (wei)"
            value={donationAmount}
            onChange={(e) => setDonationAmount(Number(e.target.value))}
            className="border-2 border-black p-2 rounded mb-2 w-full"
            disabled={!encryptedCharityDonation.canDonate}
            min="1"
          />
          <button
            className={buttonClass}
            disabled={!encryptedCharityDonation.canDonate || donationAmount <= 0}
            onClick={() => encryptedCharityDonation.donate(donationAmount)}
          >
            {encryptedCharityDonation.canDonate ? "Donate" : encryptedCharityDonation.isDonating ? "Donating..." : "Cannot donate"}
          </button>
        </div>
        <button
          className={buttonClass}
          disabled={!encryptedCharityDonation.canWithdraw}
          onClick={encryptedCharityDonation.withdraw}
        >
          {encryptedCharityDonation.canWithdraw ? "Withdraw" : encryptedCharityDonation.isWithdrawing ? "Withdrawing..." : "Cannot withdraw (not owner)"}
        </button>
      </div>
      <div className="col-span-full mx-20 p-4 rounded-lg bg-white border-2 border-black">
        {printProperty("Message", encryptedCharityDonation.message)}
      </div>
    </div>
  );
};

// Reuse printProperty and printBooleanProperty from template
function printProperty(name: string, value: unknown) {
  let displayValue: string;

  if (typeof value === "boolean") {
    return printBooleanProperty(name, value);
  } else if (typeof value === "string" || typeof value === "number") {
    displayValue = String(value);
  } else if (typeof value === "bigint") {
    displayValue = String(value);
  } else if (value === null) {
    displayValue = "null";
  } else if (value === undefined) {
    displayValue = "undefined";
  } else if (value instanceof Error) {
    displayValue = value.message;
  } else {
    displayValue = JSON.stringify(value);
  }
  return (
    <p className="text-black">
      {name}: <span className="font-mono font-semibold text-black">{displayValue}</span>
    </p>
  );
}

function printBooleanProperty(name: string, value: boolean) {
  if (value) {
    return (
      <p className="text-black">
        {name}: <span className="font-mono font-semibold text-green-500">true</span>
      </p>
    );
  }

  return (
    <p className="text-black">
      {name}: <span className="font-mono font-semibold text-red-500">false</span>
    </p>
  );
}