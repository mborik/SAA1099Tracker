/*!
 * SAA1099Tracker - Positions panel on Tracker tab
 * Copyright (c) 2020 Martin Borik <mborik@users.sourceforge.net>
 *
 * Permission is hereby granted, free of charge, to any person obtaining
 * a copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom
 * the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included
 * in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
 * EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS
 * OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
 * WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF
 * OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
//---------------------------------------------------------------------------------------

import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Col, Row } from 'react-styled-flexboxgrid';
import { Button, ButtonGroup } from '@blueprintjs/core';

import { actionChangeEditorControl } from '../../actions/tracker';
import { MAX_PATTERN_LEN } from '../../core/player/globals';
import { ReducerStoreState } from '../../reducers';

import PanelBase from '../partials/PanelBase';
import PanelCtrlRow from '../partials/PanelCtrlRow';
import RadixIntegerInput from '../partials/RadixIntegerInput';


interface PositionsState {
	noPositions: boolean;
	position: number;
	positionLength: number;
	positionSpeed: number;
	totalPositions: number;
	repeatPosition: number;
	minPositionValue: number;
	minPositionLength: number;
}

const PanelPositions: React.FunctionComponent = () => {
  const dispatch = useDispatch();

  const state = useSelector<ReducerStoreState, PositionsState | undefined>(({ tracker }) => {
    if (tracker?.player?.position) {
      const totalPositions = tracker.player.position.length || 0;
      const hasPositions = (totalPositions > 0);
      const position = hasPositions ? (tracker.player.currentPosition || 0) + 1 : 0;
      const repeatPosition = hasPositions ? (tracker.player.repeatPosition || 0) + 1 : 0;
      const positionData = hasPositions ? tracker.player.position[tracker.player.currentPosition] : tracker.player.nullPosition;
      const positionLength = positionData?.length || 0;
      const positionSpeed = positionData?.speed || 0;

      return {
        noPositions: !hasPositions,
        position,
        positionLength,
        positionSpeed,
        totalPositions: hasPositions ? totalPositions : 0,
        repeatPosition: hasPositions ? repeatPosition : 0,
        minPositionValue: hasPositions ? 1 : 0,
        minPositionLength: position ? 1 : 0,
      };
    }
  });

  return state ? (
    <PanelBase title="Positions:">
      <Row>
        <Col xs={6}>
          <PanelCtrlRow>
            <Col xs={6} className="split">
              <Button text="Create" fill={true} />
            </Col>
            <Col xs={4}>
              <label htmlFor="position">Current:</label>
            </Col>
            <Col xs={6}>
              <RadixIntegerInput
                fill={true}
                id="position"
                disabled={state.noPositions}
                min={state.minPositionValue}
                max={state.totalPositions}
                value={state.position}
                onValueChange={() => null}
              />
            </Col>
          </PanelCtrlRow>

          <PanelCtrlRow>
            <Col xs={6} className="split">
              <Button
                text="Insert"
                fill={true}
                disabled={state.noPositions}
              />
            </Col>
            <Col xs={4}>
              <label htmlFor="positionLength">Length:</label>
            </Col>
            <Col xs={6}>
              <RadixIntegerInput
                fill={true}
                id="positionLength"
                disabled={state.noPositions}
                min={state.minPositionLength}
                max={MAX_PATTERN_LEN}
                value={state.positionLength}
                onValueChange={() => null}
              />
            </Col>
          </PanelCtrlRow>

          <PanelCtrlRow>
            <Col xs={6} className="split">
              <Button
                text="Delete"
                fill={true}
                disabled={state.noPositions}
              />
            </Col>
            <Col xs={4}>
              <label htmlFor="positionSpeed">Speed:</label>
            </Col>
            <Col xs={6}>
              <RadixIntegerInput
                fill={true}
                id="positionSpeed"
                disabled={state.noPositions}
                min={1} max={31}
                value={state.positionSpeed}
                onValueChange={() => null}
              />
            </Col>
          </PanelCtrlRow>

          <PanelCtrlRow splitAbove={true}>
            <Col xs={6} className="split">
              <ButtonGroup
                fill={true}
              >
                <Button
                  icon="caret-up"
                  disabled={state.noPositions}
                />
                <Button
                  icon="caret-down"
                  disabled={state.noPositions}
                />
              </ButtonGroup>
            </Col>
            <Col xs={4}>
              <label htmlFor="repeatPosition">Repeat:</label>
            </Col>
            <Col xs={6}>
              <RadixIntegerInput
                fill={true}
                id="repeatPosition"
                disabled={state.noPositions}
                min={state.minPositionValue}
                max={state.totalPositions}
                value={state.positionSpeed}
                onValueChange={() => null}
              />
            </Col>
          </PanelCtrlRow>
        </Col>
        <Col xs={10}>

        </Col>
      </Row>
    </PanelBase>
  ) : null;
};

export default PanelPositions;
