import React from 'react';
import { useSelector } from 'react-redux';
import styled from 'styled-components';
import { ReducerStoreState } from '../reducers';


const FooterWrapper = styled.footer.attrs(() => ({
	role: 'footer',
	className: 'bp3-navbar'
}))`
	flex: 0 0 25px;
	width: 100%;
	min-height: 25px;
	margin: 0 0 -1px;
	padding: 0;
`;

const StatusBar = styled.p.attrs(() => ({
	className: 'bp3-text-small'
}))`
	letter-spacing: 1px;
	font-family: 'BPmono', monospace;
	font-weight: bold;
	position: relative;
	display: block;
	max-width: ${({ theme }) => theme.tracker.maxWidth};
	margin: 0 auto;
	padding: 6px 12px;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;

	> kbd {
		font-size: 100%;
		color: ${({ theme }) => theme.blueprint.GREEN5};
		border-radius: 3px;
		padding: 2px 4px;
	}
	> strong {
		color: ${({ theme }) => theme.blueprint.BLUE5};
	}
	> em {
		font-weight: normal;
		font-style: normal;
		color: ${({ theme }) => theme.blueprint.GRAY3};
	}
`;

const Footer: React.FunctionComponent = () => {
	const statusText = useSelector<ReducerStoreState>(state => state?.tracker?.statusText) as string;

	const statusMarkup = () => ({
		__html: !statusText ? '' : statusText
			.replace(/(\[.+?\])/g, '<strong>$1</strong>')
			.replace(/^([\w ]+?)(:| -)/, '<kbd>$1</kbd>$2')
			.replace(/(\(.+?\))$/, '<em>$1</em>')
	});

	return (
		<FooterWrapper>
			<StatusBar dangerouslySetInnerHTML={statusMarkup()}></StatusBar>
		</FooterWrapper>
	);
}

export default Footer;
