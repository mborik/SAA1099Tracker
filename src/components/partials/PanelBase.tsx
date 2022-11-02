/*!
 * SAA1099Tracker - Custom styled panel component based of @blueprintjs/Card
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

import * as React from 'react';
import { Callout, Card, ICalloutProps } from '@blueprintjs/core';
import { omit } from 'lodash';
import styled from 'styled-components';


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
    );
  }
}

export default PanelBase;
