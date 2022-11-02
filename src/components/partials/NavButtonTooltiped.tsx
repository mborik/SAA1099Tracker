/*!
 * SAA1099Tracker - Navbar button with tooltip wrapper
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
import { Button, IButtonProps, Position, Tooltip } from '@blueprintjs/core';
import { omit } from 'lodash';

export class NavButtonTooltiped extends React.Component<IButtonProps & { tooltip: string | JSX.Element, style?: React.CSSProperties; }> {
  render() {
    return (
      <Tooltip content={this.props.tooltip} position={Position.BOTTOM_LEFT} usePortal={false} disabled={this.props.disabled}>
        <Button {...omit(this.props, ['children', 'tooltip'])} minimal={true}>
          {this.props.children}
        </Button>
      </Tooltip>
    );
  }
}
