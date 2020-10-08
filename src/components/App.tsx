import * as React from "react";
import { Hotkey, Hotkeys, HotkeysTarget } from "@blueprintjs/core";

import { ReducerStoreProps } from "../reducers";
import DynamicThemeProvider from "./partials/DynamicThemeProvider";
import Navigation from "./Navigation";
import Main from "./Main";
import Footer from "./Footer";


@HotkeysTarget
class App extends React.Component<ReducerStoreProps, {}> {
	render() {
		return <DynamicThemeProvider>
			<Navigation />
			<Main />
			<Footer />
		</DynamicThemeProvider>;
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
