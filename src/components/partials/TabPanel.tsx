/*!
 * SAA1099Tracker - Custom styled various tab panel components
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
import { Icon, Navbar, Tab, TabId, Tabs } from '@blueprintjs/core';
import styled from 'styled-components';

import { actionChangeActiveTab } from '../../actions/tracker';
import { ReducerStoreState } from '../../reducers';

import TrackerContainer from '../tracker/TrackerContainer';


const TabPanelWrapper = styled(Row)`
	flex: 1 0 auto;
`;

const Tabbar = styled(Navbar)`
	height: 100%;

	.bp3-tab {
		outline: none !important;
		font-weight: 600;
	}
	.bp3-tabs {
		height: 100%;
		display: flex;
		flex-direction: column;
	}
	.bp3-tab-panel {
		flex: 1 0 auto;
		margin: 0 -1rem;
		border-top: 1px solid ${({ theme }) => theme.color.border};
	}
`;

const TabPanel: React.FunctionComponent = () => {
  const dispatch = useDispatch();

  const { activeTab } = useSelector<ReducerStoreState, { [key: string]: number }>(
    state => ({ activeTab: state?.tracker?.activeTab || 0 })
  );

  const handleTabChange = useCallback((newTabId: TabId) =>
    dispatch(actionChangeActiveTab(newTabId as number)),
  [ dispatch ]);

  return (
    <TabPanelWrapper>
      <Col xs={true}>
        <Tabbar>
          <Tabs
            large={true}
            id="activeTab"
            onChange={handleTabChange}
            selectedTabId={activeTab}
          >
            <Tab key="tab0" id={0}
              title={<span><Icon icon="column-layout" />&ensp;Tracker</span>}
              panel={<TrackerContainer />}
            />
            <Tab key="tab1" id={1} title={<span><Icon icon="grouped-bar-chart" />&ensp;Samples</span>} />
            <Tab key="tab2" id={2} title={<span><Icon icon="music" />&ensp;Ornaments</span>} />
          </Tabs>
        </Tabbar>
      </Col>
    </TabPanelWrapper>
  );
};

export default TabPanel;
