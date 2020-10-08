import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components';
import { Col, Row } from 'react-styled-flexboxgrid';
import { Icon, Navbar, Tab, TabId, Tabs } from "@blueprintjs/core";

import { ReducerStoreState } from '../../reducers';
import { actionChangeActiveTab } from '../../actions/tracker';

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
}

export default TabPanel;
