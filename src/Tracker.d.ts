declare interface TrackerCanvasPair {
	obj: HTMLCanvasElement;
	ctx: CanvasRenderingContext2D;
}
declare interface TrackerGlobalKeyState {
	inDialog: boolean;
	modsHandled: boolean;
	lastPlayMode: number;
	length: number;
}
declare interface TrackerSettings {
	tracklistAutosize: boolean;
	tracklistLines: number;
	tracklistLineHeight: number;
	hexTracklines: boolean;
	hexSampleFreq: boolean;
	audioInterrupt: number;
	audioBuffers: number;
}
declare class Tracker {
	version: string;
	loaded: boolean;
	activeTab: number;
	modePlay: boolean;
	modeEdit: boolean;
	modeEditChannel: number;
	modeEditColumn: number;
	workingPattern: number;
	workingSample: number;
	workingSampleTone: number;
	workingOrnament: number;
	workingOrnTestSample: number;
	ctrlOctave: number;
	ctrlSample: number;
	ctrlOrnament: number;
	ctrlRowStep: number;
	songTitle: string;
	songAuthor: string;
	globalKeyState: TrackerGlobalKeyState;
	settings: TrackerSettings;
	pixelfont: TrackerCanvasPair;
	manager: Manager;
	tracklist: Tracklist;
	smpornedit: SmpOrnEditor;
	player: Player;
	file: STMFile;

	updatePanels(): void;
	updateSampleEditor(update?: boolean, limitFrom?: number, limitTo?: number): void;
	updateOrnamentEditor(update?: boolean, limitFrom?: number, limitTo?: number): void;
	updateTracklist(update?: boolean): void;

	onCmdAbout(): void;
	onCmdEditClear(): void;
	onCmdEditCopy(): void;
	onCmdEditCut(): void;
	onCmdEditPaste(): void;
	onCmdFileNew(): void;
	onCmdFileOpen(): void;
	onCmdFileSave(as?: boolean): void;
	onCmdOrnClear(): void;
	onCmdOrnCompress(): void;
	onCmdOrnExpand(): void;
	onCmdOrnPlay(): void;
	onCmdOrnShiftLeft(): void;
	onCmdOrnShiftRight(): void;
	onCmdOrnTransDown(): void;
	onCmdOrnTransUp(): void;
	onCmdPatClean(): void;
	onCmdPatCreate(): void;
	onCmdPatDelete(): void;
	onCmdPatInfo(): void;
	onCmdPosCreate(): void;
	onCmdPosDelete(): void;
	onCmdPosInsert(): void;
	onCmdPosMoveDown(): void;
	onCmdPosMoveUp(): void;
	onCmdPosPlay(): void;
	onCmdPosPlayStart(): void;
	onCmdShowDocumentation(name: string): void;
	onCmdSmpClear(): void;
	onCmdSmpCopyLR(): void;
	onCmdSmpCopyRL(): void;
	onCmdSmpDisable(): void;
	onCmdSmpEnable(): void;
	onCmdSmpLVolDown(): void;
	onCmdSmpLVolUp(): void;
	onCmdSmpPlay(): void;
	onCmdSmpRVolDown(): void;
	onCmdSmpRVolUp(): void;
	onCmdSmpRotL(): void;
	onCmdSmpRotR(): void;
	onCmdSmpSwap(): void;
	onCmdSongPlay(): void;
	onCmdSongPlayStart(): void;
	onCmdStop(): void;
	onCmdToggleEditMode(newState?: boolean): void;
	onCmdToggleLoop(newState?: boolean): void;
}
declare const i18n: any;