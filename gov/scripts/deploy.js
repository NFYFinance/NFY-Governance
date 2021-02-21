async function main() {

const delay = 20;

const admin = '0x36eD40Ab12e5C943D4fcE4512c83f36276d4FF32'; //not d real one
const nfy = '0xa9B719203aFa317669cef696d88D2807552415d6'; //not d real one
const guardian = '0x2AF142784eD8f0ED17101bb091D58519560825e3'; //not d real one
const nft = '0x58DEbF4D4b04b3F5DB9e962DE81d589DD679f992'; //not d real one
const stake = '0xd4065e6BaB151701F6f5fd66E9ce1cB0fFF72236'; //not d real one

const Timelock = await ethers.getContractFactory("Timelock");
console.log("Deploying Contract...");

const timelock = await Timelock.deploy(admin,delay);
console.log("timelock contract deployed to:", timelock.address);

const Gov = await ethers.getContractFactory("GovernorAlpha");
console.log("Deploying Contract...");

const gov = await Gov.deploy(timelock.address, nfy, guardian, nft, stake );
console.log("NFY governance contract deployed to:", gov.address);
}

main()
.then(() => process.exit())
.catch(error => {
    console.error(error);
    process.exit(1);
})

//npx hardhat run --network kovan scripts/deploy.js