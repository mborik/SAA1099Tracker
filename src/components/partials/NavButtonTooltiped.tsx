import React from "react";
import { omit } from "lodash";
import { Button, IButtonProps, Position, Tooltip } from "@blueprintjs/core";

export class NavButtonTooltiped extends React.Component<IButtonProps & { tooltip: string | JSX.Element, style?: React.CSSProperties; }> {
	render() {
		return (
			<Tooltip content={this.props.tooltip} position={Position.BOTTOM_LEFT} usePortal={false} disabled={this.props.disabled}>
				<Button {...omit(this.props, ['children', 'tooltip'])} minimal={true}>
					{this.props.children}
				</Button>
			</Tooltip>
		)
	}
}
