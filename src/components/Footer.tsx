/*!
 * SAA1099Tracker - Custom styled footer panel component
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
		color: ${({ theme }) => theme.color.green};
		border-radius: 3px;
		padding: 2px 4px;
	}
	> strong {
		color: ${({ theme }) => theme.color.blue};
	}
	> em {
		font-weight: normal;
		font-style: normal;
		color: ${({ theme }) => theme.color.gray};
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
};

export default Footer;
