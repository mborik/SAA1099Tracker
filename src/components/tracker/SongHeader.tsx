/*!
 * SAA1099Tracker - Song header - title and author
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
import { Col, Row } from 'react-styled-flexboxgrid';
import { InputGroup } from '@blueprintjs/core';
import styled from 'styled-components';

import { ReducerStoreState } from '../../reducers';


const SongHeaderRow = styled(Row)`
	padding-bottom: 1rem;
`;

const SongHeader: React.FunctionComponent = () => {
  const { songTitle, songAuthor } = useSelector<ReducerStoreState, { [key: string]: string }>(state => {
    const tracker = state.tracker;

    if (tracker == null) {
      return {
        songTitle: '',
        songAuthor: ''
      };
    }
    else {
      return {
        songTitle: tracker.songTitle,
        songAuthor: tracker.songAuthor
      };
    }
  });

  return (
    <SongHeaderRow>
      <Col xs={16} sm={8}>
        <InputGroup
          fill={true}
          leftIcon="tag"
          placeholder="Song title"
          value={songTitle}
        />
      </Col>
      <Col xs={16} sm={8}>
        <InputGroup
          fill={true}
          leftIcon="user"
          placeholder="Author"
          value={songAuthor}
        />
      </Col>
    </SongHeaderRow>
  );
};

export default SongHeader;
