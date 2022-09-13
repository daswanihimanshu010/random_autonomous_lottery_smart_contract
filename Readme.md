# Verifiable Random Autonomous Decentralized Lottery Smart Contract

# All packages install for sample project

1. yarn add --dev hardhat
2. yarn hardhat
3. Create a empty project with hardhat.config.js
4. yarn add --dev @nomiclabs/hardhat-ethers@npm:hardhat-deploy-ethers ethers @nomiclabs/hardhat-etherscan @nomiclabs/hardhat-waffle chai ethereum-waffle hardhat hardhat-contract-sizer hardhat-deploy hardhat-gas-reporter prettier prettier-plugin-solidity solhint solidity-coverage dotenv
5. After installing all, we have to include them in our hardhat.config.js as require statements, so copy them.

# How do you proceed?

1. Writting a solidity function.
2. Writting a deploy script for that solidity file.
3. Import a mock deploy script if the smart contract is interacting with @chainlink/contracts so that it would work on a localhost or hardhat network in contracts/test folder. The deploy scripts run in number 00,01 so make your mock test 00-name.js. In mock we check for if the network is hardhat or localhost then only run.
4. Adding parameters values for our testnet deploy.js mentioned in contract constructor.
5. Verifying the contract code in utils folder.
6. Writting test/unit tests for hardhart network.
7. Writting staging tests in test/staging folder for real testnet.

# Tips on how to start a project

-> Before jumping in, we should write comments in our solidity file on how we are going to proceed in a step by step manner. An example you can look in Raffle.sol in top comments.

-> Use the scopes of `public, private` in `State variables (Gas consuming (storage) and non consuming (immutable and constant) )` according to how you are going to use them as a developer because `private` scope will cost less gas and you can create getters at the bottom of the contract if you want to show something to the public from these state variables as `view functions cost less gas`.

-> Using Error codes instead of require statements will cost less gas. They start with a keyword `error contractName__errorName` outside the contract defination.

-> Variables like `i_enteringFee` will be used only once that is in contructor so we can make it as immutable to save gas.

-> Variables like `s_players` contain payable address as when one of the players win we have to pay them too so we have create them using `address payable[] players`.

-> `External` scope functions are cheaper than `public` scope functions.

-> `Virtual` keyword in a function means it is expecting to be overriden.

`Note: We use module.exports in config js files from where we have to bring values, the direct running scripts like scripts in deploy and units folder, direct import modules.`

# Events

-> Whenever we update a dynamic object like an array or a mapping (whose length is not fixed) we always want to emit an event.

-> EVM (Ethereum Virtual Machine) makes blockchain tick/move like Ethereum and EVM has a logging functionality. When things happen on blockchain, the EVM writes these things to specific data structure called its `log`, inside these logs are events.

-> Events allow you to print information to this logging structure in a way that is more gas efficient instead of saving it to like a storage variables. These events and logs live in special structure that isn't accessible to smart contracts that is why it is a cheaper. So that is thing, we can print some information without having to save it in a storage variable which will take lot more gas.

-> When a transaction happens, an event is emitted so all we need to do to print some logging data is to listen for that event. This is how a lot of off chain infrastructure works.

-> This is how an event looks like:

Naming Convention of event is reverse if function name:

function enterRaffle() {

}

event RaffleEnter(address player) {

}

`event EventName(address indexed player, uint256 favouriteNumber)`

indexed variables here means that it will cost more gas than non indexed variables.
Indexed variables = Topics
indexed variables can be used to search through the logging structure as they do not get encoded and converted into hash like non indexed variables.
We can have upto 3 indexed variables in event defination.

How we can call an event ? Call or emit is same thing

`emit EventName(playerAddress, 6)`

# Chainlink VRF : Randomness

This is a two step process:

Step1: First we are going to request chainlink contracts for random number using a function `requestRandomWinner` which is an external type because external uses less gas than public.

Step2: `fulfillRandomWords()` which is a function of `VRFConsumerBaseV2.sol` avaliable in `node_modules > @chainlink > contracts > src > v0.8 > VRFConsumerBaseV2.sol` (The function defines in VRFConsumerBaseV2.sol contains a `virtual` keyword which means it is expecting to be overridden).

`fulfillRandomWords()` gives us the random words that we requested, then we can choose a winner and transfer the smart contract funds to that winner payable address.

# How to implement:

1. In order for our contract to connect to chainlink VRF we have to import the chainlink code.
   import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

2. We also add @chainlink/contracts as a package by running yarn add --dev @chainlink/contracts.

3. Looking at the contract here: https://docs.chain.link/docs/vrf/v2/examples/get-a-random-number/#analyzing-the-contract

-> After importing VRFConsumerBaseV2, our contract has to inherit VRFConsumerBaseV2 classes because our `fulfillRandomWords()` needs parameters that are avaliable in VRFConsumerBaseV2.

`contract Raffle is VRFConsumerBaseV2 {`

-> Then we can override `fulfillRandomWords()` avaliable in VRFConsumerBaseV2 and pass `uint256 requestId, uint256[] memory randomWords` as paramteres as defined in `VRFConsumerBaseV2.sol`.

-> Then in documentation we can see that we have to create a `VRFCoordinatorV2Interface` object in our constructor because that is going to request the random numbers from `VRFConsumerBaseV2` in `requestRandomWinner()`.

-> So import `VRFCoordinatorV2Interface` above, define a state variable and use it in constructor.

`VRFCoordinatorV2Interface vrfCoordinator;`

`constructor(address vrfCoordinatorV2Address) VRFConsumerBaseV2(vrfCoordinatorV2Address)`
`{ vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2Address); }`

-> Then create request_id in `requestRandomWinner()`. Take a look at the documentation to see the data type of the parameters used.

-> We have used events to record which sender has entered in `enterRaffle()` function and to see requestId in `requestRandomWinner()` function. Events help us determine in functions like these that they are working or not. Whenever that function is executed in last that event will be emitted that will help us save that information in EVM log which will give us the idea that the function ran successfully or not without using any storage variables.

# Modulo (%)

We are going get an array back when we are requesting random number. In `fulfillRandomWords()`

s_players size 10
randomWords = 202 (can be big number like anything)
202 % 10 what's doesn't divide evenly in 202
20 x 10 = 200
202 % 10 = 2nd position is the winnerIndex

randomWords[0] because we are getting only one random word.

`uint256 indexOfWinner = randomWords[0] % s_players.length;`

# Introduction to Chainlink Keepers

Automatically picking random winner on the basis of time interval without interacting with it.

Visit: https://docs.chain.link/docs/chainlink-keepers/introduction/

-> We want `requestRandomWinner()` should be executed automatically using Chainlink keepers.

-> `checkUpkeep(bytes calldata checkData)` function is checking is it time for us to get a random number or it means when we are going to call `requestRandomWinner()` function.

The parameter calldata specifies that we can call other function also using `checkUpkeep()`.

-> Chainlink keepers look for `upkeepNeeded` in `checkUpkeep()` function to return true. If it returns true `performUpkeep()` function will be executed.

-> In order to check time, to get current time we can use `block.timestamp`.

After renaming `requestRandomWinner()` to `performUpKeep()`

-> In order to request for random number in `performUpKeep()` we need to check if `checkUpkeep()` is returning true. In order to call `checkUpkeep()` from `performUpKeep()` we have to change the scope of `checkUpkeep()` from external to public because external functions cannot be called inside smart contracts also.

-> We can also pass parameters to see why did it failed.

error Raffle_UpKeepNotNeeded(
uint256 currentBalance,
uint256 numPlayers,
uint256 raffleState
);

# Deploying

1. https://docs.chain.link/docs/vrf/v2/supported-networks/ to get vrfCoordinatorV2 address for our parameter of constructor of Raffle.sol. This address is deployed contract on chainlink/contracts that helps us make the call for random numbers.

2. Because we cannot deploy vrfCoordinatorV2 in hardhat or localhost environment, we are going to create mocks.

3. To find your mocks for calling any chainlink interfaces from @chainlink/contracts we need to visit https://github.com/smartcontractkit/chainlink and follow https://github.com/smartcontractkit/chainlink/tree/develop/contracts/src/v0.8/mocks/VRFCoordinatorV2Mock.sol

-> In our previous lessons we had imported `AggregatorV3Interface` from @chainlink/contracts to get a price of ETH in terms of current USD.

-> Whenever we are interacting with chainlink oracles we need to mocks that we can find in github repo of chainlink and import them in our contracts/test folder.

-> Keep in mind regarding multiple solidity version when mock contracts from chainlink repo, we can add multiple support of our solidity versions in our hardhat.config.js.

-> Then we need to look for parameters in imported contract to pass for deployment in args param of deploy function in our mock deploy script. We can see it needs `uint96 _baseFee, uint96 _gasPriceLink` in constructor.

-> Parameter 1: For vrfCoordinatorV2 address you can go to https://docs.chain.link/docs/vrf/v2/supported-networks/#goerli-testnet for testnet and for hardhat we can get the address from our mock deployed.

-> Parameter 2: We are making `entranceFee` in networkConfig of helper-hardat-config.js because we want entraceFee to be higher when we are on higher value network. We can keep it same for hardhat network.

-> Parameter 3: `keyHash` or `gasLane` can be chosen from whichever network you are on and going to chainlink documentation https://docs.chain.link/docs/vrf/v2/supported-networks/#goerli-testnet and here we have can choose from different `gwei keyHash`.
For hardhat config you can use the same keyHash that you are using for testnet server.

-> Parameter 4: We can create subscription and fund subscription for hardhat network using the mock deployed. if you visit on github the Mock solidity file will show you methods like `createSubscription()`
and `fundSubscription(uint64 _subId, uint96 _amount)`.

As you can see in `createSubscription()` there is an event emitted saving the subscriptionId `emit SubscriptionCreated(s_currentSubId, msg.sender);`. We can get that subscriptionId in our contract from that event using `subscriptionId = transactionReceipt.events[0].args.subId`;

`transactionReceipt` will carry the information about events indexed data.

And for live test net we can create subscription using the chainlink online UI, visit here: https://vrf.chain.link/

-> Then we are going to verify our contract. Make a folder of utils in our directory. And then after you verify you can run `yarn hardhat deploy` to check everything is working fine on localhost network. Now before deploying to real testnet we have write some tests.

# Writting Unit Tests

-> Create a new folder tests in our directory and a sub folder names unit in tests and the create a new file with contractname.test.js.

1. Check for network.name, tests are writtern for hardhat network (node) in test/unit. So we need to check which network we are on.

2. For deploying your contracts in tests you can use deployments object found in hardhat library with tag: `deployments.fixture(["all"])`.

3. You can then get your deployed contracts using ethers also found in hardhat library `await ethers.getContract("ContarctName", deployer);`.

4. You can use getters() in your tests to get any value from contract for writting tests about them, comparing them using assert form chai package.

5. Special Test: `dosen't allows raffle to enter if raffle is in calculating state`

-> Here we see that we want to shift our contract in calculating state to test this test. To do that `performUpkeep()` needs to be called because it sets contract to calculating state. To call `performUpkeep()`, the `upkeepNeeded` in `checkUpkeep()` function should return true. So we have to set the conditions in `checkUpkeep()` to true in order to do that.

-> How do we do that, as the chainlink keepers (chainlink keepers call `checkUpkeep()` again and again) won't work on hardhat network. So we will become the chainlink oracles network here who will call `checkUpkeep()` function again and again and once we will return all true to call `performUpkeep()` function().

-> Always making sure to check that unit tests should run on developmentChains and staging tests on a real testnet.

`Hardhat Methods & Time Travel`

-> We are going to use soecual methods listed here: https://hardhat.org/hardhat-network/docs/reference#special-testing/debugging-methods, evm_increaseTime and evm_mine to increase the time and move 1 block in blockchain as we will be the chainlink network on hardhat.

# In order to test on live testnet

1. Get our SubId for chainlink VRF.

-> Visit: https://vrf.chain.link/

-> If LINK is not showing in your metamask wallet. Visit https://docs.chain.link/docs/vrf/v2/supported-networks/#goerli-testnet and click on add to wallet.

-> Copy the subId from https://vrf.chain.link/ active subscription and paste it in helper-hardhat-config.js

-> You can check how much LINK will it cost from https://docs.chain.link/docs/vrf/v2/supported-networks/#goerli-testnet

2. Deploy our contract using the SubId.

-> Deployed contract address: 0x92f227b5Fa43480F2756290b4F5bAF5fF05D8E11
-> Verified at: https://goerli.etherscan.io/address/0x92f227b5Fa43480F2756290b4F5bAF5fF05D8E11#code

3. Register the contract with Chainlink VRF & it's subId.

-> Then add a consumer to subscription Id of chainlink vrf.

4. Register the contract with Chainlink keepers.

-> Visit: https://keepers.chain.link/ and register new upKeep

5. Run staging tests.

-> https://goerli.etherscan.io/tx/0xb52b770049a4fce5493dabcf9ccb5879edd23c5aef5ec29b76975a6662522d07#eventlog
