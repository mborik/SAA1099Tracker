import { Hotkey, Hotkeys, HotkeysTarget } from "@blueprintjs/core";
import * as React from "react";

import { ReducerStoreProps } from "../reducers";
import Navigation from "./Navigation";


@HotkeysTarget
class App extends React.PureComponent<ReducerStoreProps, {}> {
	render() {
		return <main className="bp3-fill" role="main">
			<Navigation />
		</main>;
	}

	renderHotkeys() {
		return (
			<Hotkeys>
				<Hotkey
					global={true}
					combo="esc"
					label="Stop"
					onKeyDown={() => console.log("Stop!")}
				/>
			</Hotkeys>
		);
	}
}

/*
 * This is workaround to strange issue with HotkeysTarget decorator from
 * https://github.com/palantir/blueprint/issues/2972#issuecomment-441978641
 */
function AppWrapper() {} // tslint:disable-line no-empty
AppWrapper.prototype = Object.create(App.prototype);
const AppContainer = HotkeysTarget(AppWrapper as any);
export default AppContainer;
