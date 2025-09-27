import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedotingEncryptedCharityDonation= await  deploy("EncryptedCharityDonation", {
    from: deployer,
    log: true,
    args: ["0x9360B03bf95FD3311672D4E4895d2892bd4DE917"]
  });


  console.log(`EncryptedCharityDonation contract:` , deployedotingEncryptedCharityDonation.address);
 
};
export default func;
func.id = "deploy"; // id required to prevent reexecution
func.tags = ["EncryptedCharityDonation"];