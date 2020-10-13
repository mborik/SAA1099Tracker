/*!
 * SAA1099Tracker - Custom styled flex row component
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

import styled, { StyledProps } from 'styled-components';
import { ReactStyledFlexboxgrid, Row, Col } from 'react-styled-flexboxgrid';

type ICustomRowProps = StyledProps<ReactStyledFlexboxgrid.IRowProps> & {
	gutter?: number;
	splitAbove?: boolean;
};

const PanelCtrlRow = styled(Row).attrs((props: ICustomRowProps) => ({
	middle: 'xs',
	gutter: `${(props.gutter || props.theme.flexboxgrid.gutterWidth || 0)}rem`,
	cssSplitterAbove: props.splitAbove && `
		border-top: 1px solid ${props.theme.color.border};
		padding-top: ${(props.gutter || props.theme.flexboxgrid.gutterWidth || 0)}rem;
	`
}))`
	margin: ${props => props.gutter} ${props => props.gutter} 0;
	${({ cssSplitterAbove }) => cssSplitterAbove || ''}

	&:last-child {
		margin-bottom: ${props => props.gutter};
	}

	${Col}.split {
		display: flex;
		flex-flow: row nowrap;

		&::after {
			content: '\u200b';
			flex: 0 0 0;
			display: block;
			border-right: 1px solid ${({ theme }) => theme.color.border};
			width: 0;
			min-height: 100%;
			margin: -4px ${props => props.gutter};
		}
	}
`;

export default PanelCtrlRow;
