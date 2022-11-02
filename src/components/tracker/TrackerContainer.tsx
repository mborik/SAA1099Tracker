/*!
 * SAA1099Tracker - Panel wrapper on Tracker tab
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
import { Col, Row } from 'react-styled-flexboxgrid';

import PanelEditor from './PanelEditor';
import PanelPatterns from './PanelPatterns';
import PanelPositions from './PanelPositions';


const TrackerContainer: React.FunctionComponent = () => {
  return (
    <Row>
      <Col xs={6} sm={6} md={6} lg={2}>
        <PanelEditor />
      </Col>
      <Col xs={10} sm={10} md={10} lg={4}>
        <PanelPatterns />
      </Col>
      <Col xs={16} sm={16} md={16} lg={10}>
        <PanelPositions />
      </Col>
    </Row>
  );
};

export default TrackerContainer;
