import * as React from 'react';
import { omit } from 'lodash';
import styled from 'styled-components';
import { Callout, Card, ICalloutProps } from '@blueprintjs/core';


const CardExt = styled(Card)`
	border: 1px solid ${({ theme }) => theme.color.border};
	border-top: 0;
	border-top-left-radius: 0;
	border-top-right-radius: 0;
	box-shadow: none !important;
	padding: 0;

	.bp3-callout {
		background: ${({ theme }) => theme.color.grayPanel};
		border-bottom: 1px solid ${({ theme }) => theme.color.border};
		border-radius: 0;

		> h4.bp3-heading {
			font-size: 15px;
			font-weight: normal;
		}
	}
`;

export class PanelBase extends React.Component<ICalloutProps> {
	render() {
		return (
			<CardExt>
				<Callout {...omit(this.props, ['children'])} />
				{this.props.children}
			</CardExt>
		)
	}
}

export default PanelBase;
