/*!
 * SAA1099Tracker - Navbar group - Edit operations
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

const EditOps: React.FunctionComponent = () => (
  <Navbar.Group>
    <NavButtonTooltiped
      key="miEditCut"
      icon="remove-column"
      minimal={true}
      tooltip={<>
        <label>Cut</label>
        <KeyCombo combo="mod+X" />
      </>}
    />
    <NavButtonTooltiped
      key="miEditCopy"
      icon="menu-open"
      minimal={true}
      tooltip={<>
        <label>Copy</label>
        <KeyCombo combo="mod+C" />
      </>}
    />
    <NavButtonTooltiped
      key="miEditPaste"
      icon="th-derived"
      minimal={true}
      tooltip={<>
        <label>Paste</label>
        <KeyCombo combo="mod+V" />
      </>}
    />
    <NavButtonTooltiped
      key="miEditDelete"
      icon="trash"
      minimal={true}
      tooltip={<>
        <label>Delete</label>
        <KeyCombo combo="mod+D" />
      </>}
    />

    <Navbar.Divider />

    <NavButtonTooltiped
      key="miEditUndo"
      icon="undo"
      minimal={true}
      tooltip={<>
        <label>Undo</label>
        <KeyCombo combo="mod+Z" />
      </>}
    />
    <NavButtonTooltiped
      key="miEditRedo"
      icon="redo"
      minimal={true}
      tooltip={<>
        <label>Redo</label>
        <KeyCombo combo="mod+Y" />
        <KeyCombo combo="mod+shift+Z" />
      </>}
    />
  </Navbar.Group>
);

export default EditOps;
