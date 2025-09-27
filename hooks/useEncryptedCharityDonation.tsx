
"use client";

import { ethers } from "ethers";
import { RefObject, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes"; // Adjust path based on your project
import { GenericStringStorage } from "@/fhevm/GenericStringStorage"; // Adjust path

import { EncryptedCharityDonationAddresses } from "@/abi/EncryptedCharityDonationAddresses"; // Assume you create this similar to ConfidentialP2PEtherAddresses
import { EncryptedCharityDonationABI } from "@/abi/EncryptedCharityDonationABI"; // The new ABI file

type EncryptedCharityDonationInfoType = {
  abi: typeof EncryptedCharityDonationABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

function getEncryptedCharityDonationByChainId(chainId: number | undefined): EncryptedCharityDonationInfoType {
  if (!chainId) {
    return { abi: EncryptedCharityDonationABI.abi };
  }

  const chainIdStr = chainId.toString() as keyof typeof EncryptedCharityDonationAddresses;
  const entry = EncryptedCharityDonationAddresses[chainIdStr];

  if (!entry || !("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: EncryptedCharityDonationABI.abi, chainId };
  }

  return {
    address: entry?.address as `0x${string}` | undefined,
    chainId: entry?.chainId ?? chainId,
    chainName: entry?.chainName,
    abi: EncryptedCharityDonationABI.abi,
  };
}

export const useEncryptedCharityDonation = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<(ethersSigner: ethers.JsonRpcSigner | undefined) => boolean>;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    eip1193Provider,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  // States and Refs
  const [hasDonated, setHasDonated] = useState<boolean>(false);
  const [encryptedDonation, setEncryptedDonation] = useState<string | undefined>(undefined);
  const [encryptedTotalDonations, setEncryptedTotalDonations] = useState<string | undefined>(undefined);
  const [currentTimestamp, setCurrentTimestamp] = useState<number>(0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDonating, setIsDonating] = useState<boolean>(false);
  const [isWithdrawing, setIsWithdrawing] = useState<boolean>(false);
  const [isOwner, setIsOwner] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const encryptedCharityDonationRef = useRef<EncryptedCharityDonationInfoType | undefined>(undefined);
  const isRefreshingRef = useRef<boolean>(isRefreshing);
  const isDonatingRef = useRef<boolean>(isDonating);
  const isWithdrawingRef = useRef<boolean>(isWithdrawing);

  // EncryptedCharityDonation Contract
  const encryptedCharityDonation = useMemo(() => {
    const c = getEncryptedCharityDonationByChainId(chainId);

    encryptedCharityDonationRef.current = c;

    if (!c.address) {
      setMessage(`EncryptedCharityDonation deployment not found for chainId=${chainId}.`);
    }

    return c;
  }, [chainId]);

  // isDeployed
  const isDeployed = useMemo(() => {
    if (!encryptedCharityDonation) {
      return undefined;
    }
    return Boolean(encryptedCharityDonation.address) && encryptedCharityDonation.address !== ethers.ZeroAddress;
  }, [encryptedCharityDonation]);

  // canGetState
  const canGetState = useMemo(() => {
    return encryptedCharityDonation.address && ethersReadonlyProvider && eip1193Provider && !isRefreshing;
  }, [encryptedCharityDonation.address, ethersReadonlyProvider, eip1193Provider, isRefreshing]);

  // Refresh State
  const refreshState = useCallback(async () => {
    console.log("[useEncryptedCharityDonation] Starting refreshState");
    if (isRefreshingRef.current) {
      console.log("[useEncryptedCharityDonation] Already refreshing, skipping");
      return;
    }

    if (
      !encryptedCharityDonationRef.current ||
      !encryptedCharityDonationRef.current?.chainId ||
      !encryptedCharityDonationRef.current?.address ||
      !ethersReadonlyProvider ||
      !ethersSigner ||
      !eip1193Provider
    ) {
      console.log("[useEncryptedCharityDonation] Missing required parameters for refresh");
      return;
    }

    isRefreshingRef.current = true;
    setIsRefreshing(true);

    const thisChainId = encryptedCharityDonationRef.current.chainId;
    const thisEncryptedCharityDonationAddress = encryptedCharityDonationRef.current.address;

    const thisEncryptedCharityDonationContract = new ethers.Contract(
      thisEncryptedCharityDonationAddress,
      encryptedCharityDonationRef.current.abi,
      ethersReadonlyProvider,
    );

    try {
      const provider = new ethers.BrowserProvider(eip1193Provider);
      const latestBlock = await provider.getBlock("latest");
      const currentTs = latestBlock ? latestBlock.timestamp : 0;
      console.log("[useEncryptedCharityDonation] Current Timestamp:", currentTs);
      setCurrentTimestamp(currentTs);

      const userAddress = await ethersSigner.getAddress();
      console.log("[useEncryptedCharityDonation] User Address:", userAddress);

      // Get encrypted donation balance
      const donationHandle = await thisEncryptedCharityDonationContract.balanceOf(userAddress);
      console.log("[useEncryptedCharityDonation] Encrypted Donation Handle:", donationHandle);
      setEncryptedDonation(donationHandle);
      setHasDonated(donationHandle !== "0x0000000000000000000000000000000000000000000000000000000000000000"); // Check if non-zero handle

      // Get encrypted total donations
      const totalDonationsHandle = await thisEncryptedCharityDonationContract.totalDonations();
      console.log("[useEncryptedCharityDonation] Encrypted Total Donations Handle:", totalDonationsHandle);
      setEncryptedTotalDonations(totalDonationsHandle);

      // Check if user is charity owner
      const owner = await thisEncryptedCharityDonationContract.charityOwner();
      setIsOwner(userAddress.toLowerCase() === owner.toLowerCase());

      if (sameChain.current(thisChainId) && thisEncryptedCharityDonationAddress === encryptedCharityDonationRef.current?.address) {
        console.log("[useEncryptedCharityDonation] States updated successfully");
      }
    } catch (e) {
      console.error("[useEncryptedCharityDonation] State refresh failed:", (e as Error).message);
      setMessage("EncryptedCharityDonation state refresh failed! error=" + (e as Error).message);
    } finally {
      isRefreshingRef.current = false;
      setIsRefreshing(false);
      console.log("[useEncryptedCharityDonation] Refresh completed");
    }
  }, [ethersReadonlyProvider, eip1193Provider, ethersSigner, sameChain]);

  // Auto refresh
  useEffect(() => {
    console.log("[useEncryptedCharityDonation] Triggering auto-refresh");
    refreshState();
  }, [refreshState]);

  // Listen for Events
  useEffect(() => {
    if (!encryptedCharityDonation.address || !ethersReadonlyProvider) return;

    const contract = new ethers.Contract(
      encryptedCharityDonation.address,
      encryptedCharityDonation.abi,
      ethersReadonlyProvider,
    );

    const userAddress = ethersSigner ? ethersSigner.address.toLowerCase() : undefined;

    // Listen for user's events
    if (userAddress) {
      const donationFilter = contract.filters.Donation(userAddress);
      contract.on(donationFilter, () => {
        console.log("[useEncryptedCharityDonation] Donation event received");
        setMessage("Donation successful");
        refreshState();
      });

      const withdrawalRequestedFilter = contract.filters.WithdrawalRequested(userAddress);
      contract.on(withdrawalRequestedFilter, () => {
        console.log("[useEncryptedCharityDonation] WithdrawalRequested event received");
        setMessage("Withdrawal initiated");
        refreshState();
      });

      const withdrawnFilter = contract.filters.Withdrawn(userAddress);
      contract.on(withdrawnFilter, () => {
        console.log("[useEncryptedCharityDonation] Withdrawn event received");
        setMessage("Withdrawal completed");
        refreshState();
      });
    }

    return () => {
      contract.removeAllListeners("Donation");
      contract.removeAllListeners("WithdrawalRequested");
      contract.removeAllListeners("Withdrawn");
    };
  }, [encryptedCharityDonation.address, ethersReadonlyProvider, ethersSigner, refreshState]);

  // canDonate
  const canDonate = useMemo(() => {
    return (
      encryptedCharityDonation.address &&
      instance &&
      ethersSigner &&
      !isRefreshing &&
      !isDonating
    );
  }, [
    encryptedCharityDonation.address,
    instance,
    ethersSigner,
    isRefreshing,
    isDonating,
  ]);

  // canWithdraw
  const canWithdraw = useMemo(() => {
    return (
      encryptedCharityDonation.address &&
      ethersSigner &&
      !isRefreshing &&
      !isWithdrawing &&
      isOwner
    );
  }, [
    encryptedCharityDonation.address,
    ethersSigner,
    isRefreshing,
    isWithdrawing,
    isOwner,
  ]);

  // Donate
  const donate = useCallback(
    async (clearAmount: number) => { // Amount in wei
      if (isRefreshingRef.current || isDonatingRef.current) {
        console.log("[useEncryptedCharityDonation] Already refreshing or donating, skipping");
        return;
      }

      if (!encryptedCharityDonation.address || !instance || !ethersSigner || clearAmount <= 0) {
        setMessage("Invalid amount (>0) or missing parameters");
        return;
      }

      if (clearAmount > Number.MAX_SAFE_INTEGER || clearAmount > 2**128 - 1) {
        setMessage("Amount exceeds uint128 limit");
        return;
      }

      const value = BigInt(clearAmount);

      const thisChainId = chainId;
      const thisEncryptedCharityDonationAddress = encryptedCharityDonation.address;
      const thisEthersSigner = ethersSigner;
      const thisEncryptedCharityDonationContract = new ethers.Contract(
        thisEncryptedCharityDonationAddress,
        encryptedCharityDonation.abi,
        thisEthersSigner,
      );

      isDonatingRef.current = true;
      setIsDonating(true);
      setMessage(`Starting donation with amount ${clearAmount} wei...`);

      const run = async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const isStale = () =>
          thisEncryptedCharityDonationAddress !== encryptedCharityDonationRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          const signerAddr = await thisEthersSigner.getAddress();
          const input = instance.createEncryptedInput(thisEncryptedCharityDonationAddress, signerAddr);
          input.add128(clearAmount); // Using add128 for euint128
          const enc = await input.encrypt();

          if (isStale()) {
            setMessage(`Ignore donation`);
            return;
          }

          setMessage(`Calling donate...`);

          const tx: ethers.TransactionResponse = await thisEncryptedCharityDonationContract.donate(
            enc.handles[0],
            enc.inputProof,
            { value }
          );

          setMessage(`Waiting for tx: ${tx.hash}...`);

          const receipt = await tx.wait();
          if (receipt?.status !== 1) {
            throw new Error("Transaction failed");
          }

          setMessage(`Donation completed, status=${receipt?.status}.`);

          if (isStale()) {
            setMessage(`Ignore donation`);
            return;
          }

          await refreshState();
        } catch (e) {
          console.error("[useEncryptedCharityDonation] Donation failed:", (e as Error).message);
          setMessage(`Donation Failed! error=${(e as Error).message}`);
          await refreshState();
        } finally {
          isDonatingRef.current = false;
          setIsDonating(false);
        }
      };

      run();
    },
    [
      ethersSigner,
      encryptedCharityDonation.address,
      encryptedCharityDonation.abi,
      instance,
      chainId,
      refreshState,
      sameChain,
      sameSigner,
    ],
  );

  // Withdraw
  const withdraw = useCallback(
    async () => {
      if (isRefreshingRef.current || isWithdrawingRef.current) {
        console.log("[useEncryptedCharityDonation] Already refreshing or withdrawing, skipping");
        return;
      }

      if (!encryptedCharityDonation.address || !ethersSigner) {
        setMessage("Missing parameters");
        return;
      }

      const thisChainId = chainId;
      const thisEncryptedCharityDonationAddress = encryptedCharityDonation.address;
      const thisEthersSigner = ethersSigner;
      const thisEncryptedCharityDonationContract = new ethers.Contract(
        thisEncryptedCharityDonationAddress,
        encryptedCharityDonation.abi,
        thisEthersSigner,
      );

      isWithdrawingRef.current = true;
      setIsWithdrawing(true);
      setMessage(`Starting withdraw...`);

      const run = async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const isStale = () =>
          thisEncryptedCharityDonationAddress !== encryptedCharityDonationRef.current?.address ||
          !sameChain.current(thisChainId) ||
          !sameSigner.current(thisEthersSigner);

        try {
          if (isStale()) {
            setMessage(`Ignore withdraw`);
            return;
          }

          setMessage(`Calling requestWithdrawal...`);

          const tx: ethers.TransactionResponse = await thisEncryptedCharityDonationContract.requestWithdrawal();

          setMessage(`Waiting for tx: ${tx.hash}...`);

          const receipt = await tx.wait();
          if (receipt?.status !== 1) {
            throw new Error("Transaction failed");
          }

          setMessage(`Withdraw transaction confirmed, awaiting callback...`);

          if (isStale()) {
            setMessage(`Ignore withdraw`);
            return;
          }
        } catch (e) {
          console.error("[useEncryptedCharityDonation] Withdraw failed:", (e as Error).message);
          setMessage(`Withdraw Failed! error=${(e as Error).message}`);
          await refreshState();
        } finally {
          isWithdrawingRef.current = false;
          setIsWithdrawing(false);
        }
      };

      run();
    },
    [
      ethersSigner,
      encryptedCharityDonation.address,
      encryptedCharityDonation.abi,
      chainId,
      refreshState,
      sameChain,
      sameSigner,
    ],
  );

  return {
    contractAddress: encryptedCharityDonation.address,
    canGetState,
    canDonate,
    canWithdraw,
    donate,
    withdraw,
    refreshState,
    message,
    hasDonated,
    encryptedDonation,
    encryptedTotalDonations,
    currentTimestamp,
    isRefreshing,
    isDonating,
    isWithdrawing,
    isOwner,
    isDeployed,
  };
}