/*!
 * SAA1099Tracker - Navbar group - Tracker tools panel
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
import { KeyCombo, Navbar } from '@blueprintjs/core';

import { NavButtonTooltiped } from '../partials/NavButtonTooltiped';

const Tools: React.FunctionComponent = () => (
  <Navbar.Group>
    <NavButtonTooltiped
      key="miManager"
      icon="comparison"
      disabled={true}
      tooltip={<>
        <label>Track manager</label>
        <KeyCombo combo="F9" />
      </>}
    />
    <NavButtonTooltiped
      key="miPreferences"
      icon="cog"
      tooltip={<>
        <label>Preferences</label>
        <KeyCombo combo="F10" />
      </>}
    />
  </Navbar.Group>
);

export default Tools;
