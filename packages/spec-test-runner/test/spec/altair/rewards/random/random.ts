/* eslint-disable @typescript-eslint/naming-convention */
import {join} from "path";
import {expect} from "chai";

import {describeDirectorySpecTest, InputType} from "@chainsafe/lodestar-spec-test-util";
import {altair, allForks} from "@chainsafe/lodestar-beacon-state-transition";
import {SPEC_TEST_LOCATION} from "../../../../utils/specTestCases";
import {TreeBacked} from "@chainsafe/ssz";
import {createIBeaconConfig} from "@chainsafe/lodestar-config";
import {
  getFlagIndexDeltas,
  getInactivityPenaltyDeltas,
} from "@chainsafe/lodestar-beacon-state-transition/lib/altair/epoch/balance";
import {
  PresetName,
  TIMELY_HEAD_FLAG_INDEX,
  TIMELY_SOURCE_FLAG_INDEX,
  TIMELY_TARGET_FLAG_INDEX,
} from "@chainsafe/lodestar-params";
import {ssz} from "@chainsafe/lodestar-types";
import {Deltas, Output, RewardTestCase} from "../type";

// eslint-disable-next-line @typescript-eslint/naming-convention
const config = createIBeaconConfig({ALTAIR_FORK_EPOCH: 0});

export function runRandom(presetName: PresetName): void {
  describeDirectorySpecTest<RewardTestCase, Output>(
    `altair rewards random ${presetName}`,
    join(SPEC_TEST_LOCATION, `tests/${presetName}/altair/rewards/random/pyspec_tests`),
    (testcase) => {
      const wrappedState = allForks.createCachedBeaconState<altair.BeaconState>(
        config,
        (testcase.pre as TreeBacked<altair.BeaconState>).clone()
      );
      const process = allForks.prepareEpochProcessState(wrappedState);
      return {
        head_deltas: getFlagIndexDeltas(wrappedState, process, TIMELY_HEAD_FLAG_INDEX),
        source_deltas: getFlagIndexDeltas(wrappedState, process, TIMELY_SOURCE_FLAG_INDEX),
        target_deltas: getFlagIndexDeltas(wrappedState, process, TIMELY_TARGET_FLAG_INDEX),
        inactivity_penalty_deltas: getInactivityPenaltyDeltas(wrappedState, process),
      };
    },
    {
      inputTypes: {
        pre: {
          type: InputType.SSZ_SNAPPY,
          treeBacked: true,
        },
      },
      sszTypes: {
        pre: ssz.altair.BeaconState,
        head_deltas: Deltas,
        source_deltas: Deltas,
        target_deltas: Deltas,
        inactivity_penalty_deltas: Deltas,
      },
      getExpected: (testCase) => ({
        head_deltas: testCase.head_deltas,
        source_deltas: testCase.source_deltas,
        target_deltas: testCase.target_deltas,
        inactivity_penalty_deltas: testCase.inactivity_penalty_deltas,
      }),
      expectFunc: (testCase, expected, actual) => {
        expect(actual).to.deep.equal(expected);
      },
    }
  );
}
