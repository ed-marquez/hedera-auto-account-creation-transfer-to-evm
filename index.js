console.clear();

require("dotenv").config();

const { Client, AccountId, PrivateKey, Hbar, TransferTransaction, TransactionRecordQuery } = require("@hashgraph/sdk");

const operatorId = AccountId.fromString(process.env.OPERATOR_ID);
const operatorKey = PrivateKey.fromStringED25519(process.env.OPERATOR_PVKEY);
const client = Client.forTestnet().setOperator(operatorId, operatorKey);

async function main() {
	let newEvmAddressArray = [];
	let newAccountAliasArray = [];
	const numAccountsToCreate = 2;
	for (let i = 0; i < numAccountsToCreate; i++) {
		//Create the account alias
		const newPrivateKey = PrivateKey.generateECDSA();
		const newPublicKey = newPrivateKey.publicKey;
		const newEvmAddress = newPublicKey.toEvmAddress();
		const newAccountAlias = newPublicKey.toAccountId(0, 0);

		newEvmAddressArray.push(newEvmAddress);
		newAccountAliasArray.push(newAccountAlias);

		console.log(`- New private key (DER Encoded): ${newPrivateKey} \n`);
		console.log(`- New public key (DER Encoded): ${newPublicKey} \n`);
		console.log(`- New EVM Address: 0x${newEvmAddress} \n`);
		console.log(`- New account alias: ${newAccountAlias} \n`);
		// console.log(`- New private key (RAW): 0x${newPrivateKey.toStringRaw()} \n`);
		// console.log(`- New public key (RAW): 0x${newPublicKey.toStringRaw()} \n`);
		console.log(`============================================================ \n`);
	}

	//Transfer hbar to the account alias
	const transferToAliasTx = new TransferTransaction()
		.addHbarTransfer(operatorId, new Hbar(-0.1))
		.addHbarTransfer(newAccountAliasArray[0], new Hbar(0.1))
		.addHbarTransfer(operatorId, new Hbar(-0.15))
		.addHbarTransfer(newAccountAliasArray[1], new Hbar(0.15))
		.freezeWith(client);
	const transferToAliasSign = await transferToAliasTx.sign(operatorKey);
	const transferToAliasSubmit = await transferToAliasSign.execute(client);
	const transferToAliasRx = await transferToAliasSubmit.getReceipt(client);
	console.log(`- Transfer status: ${transferToAliasRx.status} \n`);

	// Get a transaction record and query the record
	const transferToAliasRec = await transferToAliasSubmit.getRecord(client);
	const txRec = await new TransactionRecordQuery().setTransactionId(transferToAliasRec.transactionId).setIncludeChildren(true).execute(client);

	console.log(`- Parent transaction ID: ${txRec.transactionId} \n`);
	console.log(`- Parent tx on HashScan: https://hashscan.io/testnet/transactionsById/${txRec.transactionId}`);
	console.log(`============================================================ \n`);

	for (let i = 0; i < numAccountsToCreate; i++) {
		console.log(`- New account ID ${i + 1} (from Record): ${txRec.children[i].receipt.accountId.toString()} \n`);
		console.log(`- New EVM address ${i + 1} (from Record): 0x${txRec.children[i].evmAddress.toString()} \n`);
	}
	client.close();
}
main();
