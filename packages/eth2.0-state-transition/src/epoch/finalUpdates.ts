/**
 * @module chain/stateTransition/epoch
 */

import {hashTreeRoot} from "@chainsafe/ssz";
import BN from "bn.js";

import {BeaconState, HistoricalBatch} from "@chainsafe/eth2.0-types";
import {IBeaconConfig} from "@chainsafe/eth2.0-config";
import {
  getCurrentEpoch,
  getRandaoMix
} from "../util";
import {bnMin, intDiv} from "@chainsafe/eth2.0-utils";


export function processFinalUpdates(config: IBeaconConfig, state: BeaconState): void {
  const currentEpoch = getCurrentEpoch(config, state);
  const nextEpoch = currentEpoch + 1;
  // Reset eth1 data votes
  if ((state.slot + 1) % config.params.SLOTS_PER_ETH1_VOTING_PERIOD === 0) {
    state.eth1DataVotes = [];
  }
  // Update effective balances with hysteresis
  state.validators.forEach((validator, index) => {
    const balance = state.balances[index];
    const HALF_INCREMENT = config.params.EFFECTIVE_BALANCE_INCREMENT.div(new BN(2));
    if (
      balance.lt(validator.effectiveBalance) ||
      validator.effectiveBalance.add(HALF_INCREMENT.muln(3)).lt(balance)
    ) {
      validator.effectiveBalance = bnMin(
        balance.sub(balance.mod(config.params.EFFECTIVE_BALANCE_INCREMENT)),
        config.params.MAX_EFFECTIVE_BALANCE);
    }
  });
  // Reset slashings
  state.slashings[nextEpoch % config.params.EPOCHS_PER_SLASHINGS_VECTOR] = new BN(0);
  // Set randao mix
  state.randaoMixes[nextEpoch % config.params.EPOCHS_PER_HISTORICAL_VECTOR] =
    getRandaoMix(config, state, currentEpoch);
  // Set historical root accumulator
  if (nextEpoch % intDiv(config.params.SLOTS_PER_HISTORICAL_ROOT, config.params.SLOTS_PER_EPOCH) === 0) {
    const historicalBatch: HistoricalBatch = {
      blockRoots: state.blockRoots,
      stateRoots: state.stateRoots,
    };
    state.historicalRoots.push(hashTreeRoot(historicalBatch, config.types.HistoricalBatch));
  }
  // Rotate current/previous epoch attestations
  state.previousEpochAttestations = state.currentEpochAttestations;
  state.currentEpochAttestations = [];
}
