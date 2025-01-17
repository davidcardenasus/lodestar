/* eslint-disable @typescript-eslint/naming-convention */
import {expect} from "chai";
import Web3 from "web3";
import {LCTransport} from "../../src/interfaces.js";
import {createVerifiedExecutionProvider} from "../../src/web3_provider.js";
import {rpcUrl, beaconUrl, config} from "../utils/e2e_env.js";
import {getVerificationFailedMessage} from "../../src/utils/json_rpc.js";

describe("web3_batch_requests", function () {
  // Give some margin to sync light client
  this.timeout("10s");

  let web3: Web3;

  before(() => {
    const {provider} = createVerifiedExecutionProvider(new Web3.providers.HttpProvider(rpcUrl), {
      transport: LCTransport.Rest,
      urls: [beaconUrl],
      config,
    });

    web3 = new Web3(provider);
  });

  describe("web3", () => {
    it("should be able to process batch request", async () => {
      const accounts = await web3.eth.getAccounts();
      const batch = new web3.eth.BatchRequest();
      const results = [];

      for (const account of accounts) {
        results.push(
          batch.add({
            method: "eth_getBalance",
            params: [account, "latest"],
          })
        );
        results.push(
          batch.add({
            method: "eth_getProof",
            params: [account, [], "latest"],
          })
        );
      }

      await batch.execute();

      expect(results.length).to.be.gt(1);
      await expect(Promise.all(results)).to.be.fulfilled;
    });

    it("should be able to process batch request containing error", async () => {
      const accounts = await web3.eth.getAccounts();
      const batch = new web3.eth.BatchRequest();

      const successRequest = batch.add({
        method: "eth_getBalance",
        params: [accounts[0], "latest"],
      });

      const invalidHash = "0x9dccb8cd5417e188701e2f36adf8ad17eec7913d34c3517ba74fcfd870bed8e6";
      const errorRequest = batch.add({
        method: "eth_getBlockByHash",
        params: [invalidHash, false],
      });

      await batch.execute();

      await expect(successRequest).to.be.fulfilled;
      await expect(errorRequest).to.be.rejectedWith(getVerificationFailedMessage("eth_getBlockByHash"));
    });
  });
});
