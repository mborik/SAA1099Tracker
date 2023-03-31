/**
 * SAA1099Tracker: Entry point
 * Copyright (c) 2012-2023 Martin Borik <martin@borik.net>
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

import AudioDriver from '../commons/audio';
import { devLog } from '../commons/dev';
import SyncTimer from '../commons/timer';
import Compiler from '../compiler';
import Player from '../player/Player';
import { SAASound } from '../saa/SAASound';
import { TrackerDoc } from './doc';
import { File } from './file.import';
import { HotkeyMapType } from './keyboard';
import Manager from './manager';
import Settings from './settings';
import SmpOrnEditor from './smporn';
import Tracklist from './tracklist';


export interface TrackerGlobalKeyState {
  inDialog: boolean;
  isMetaKey: boolean;
  isShifted: boolean;
  lastPlayMode: number;
}

export interface TrackerCanvasPair {
  obj: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export default class Tracker {
  doc: TrackerDoc;

  loaded: boolean = false;
  destroying: boolean = false;
  activeTab: number = 0;
  modePlay: boolean = false;
  modeEdit: boolean = false;
  modeEditChannel: number = 0;
  modeEditColumn: number = 0;
  workingPattern: number = 0;
  workingPatternTarget: number = 0;
  workingSample: number = 1;
  workingSampleTone: number = 37;
  workingOrnament: number = 1;
  workingOrnTestSample: number = 1;
  ctrlOctave: number = 2;
  ctrlSample: number = 0;
  ctrlOrnament: number = 0;
  ctrlRowStep: number = 0;
  songTitle: string = '';
  songAuthor: string = '';

  globalKeyState: TrackerGlobalKeyState = {
    inDialog: false,
    isMetaKey: false,
    isShifted: false,
    lastPlayMode: 0,
  };

  pixelfont: TrackerCanvasPair = { obj: null, ctx: null };
  settings: Settings;
  manager: Manager;
  tracklist: Tracklist;
  smpornedit: SmpOrnEditor;

  player: Player;
  file: File;
  compiler: Compiler;

  updatePanels: (this: Tracker) => void;
  updatePanelInfo: (this: Tracker) => void;
  updatePanelPattern: (this: Tracker) => void;
  updatePanelPosition: (this: Tracker) => void;
  updateEditorCombo: (this: Tracker, step?: number) => void;
  updateSampleEditor: (this: Tracker, update?: boolean, limitFrom?: number, limitTo?: number) => void;
  updateOrnamentEditor: (this: Tracker, update?: boolean, limitFrom?: number, limitTo?: number) => void;
  updateTracklist: (this: Tracker, update?: boolean) => void;
  initPixelFont: (this: Tracker, font: HTMLImageElement) => void;
  onCmdAppUpdate: (this: Tracker, status: Error, data: any) => void;
  onCmdAppExit: (this: Tracker) => void;
  onCmdAbout: (this: Tracker) => void;
  onCmdEditClear: (this: Tracker) => void;
  onCmdEditCopy: (this: Tracker) => Promise<void>;
  onCmdEditCopyAsTracklist: (this: Tracker) => Promise<void>;
  onCmdEditCut: (this: Tracker) => void;
  onCmdEditPaste: (this: Tracker) => void;
  onCmdEditPasteSpecial: (this: Tracker) => void;
  onCmdEditUndo: (this: Tracker) => void;
  onCmdEditRedo: (this: Tracker) => void;
  onCmdFileNew: (this: Tracker) => void;
  onCmdFileOpen: (this: Tracker) => void;
  onCmdFileSave: (this: Tracker, as?: boolean) => void;
  onCmdFileImport: (this: Tracker, type?: string) => void;
  onCmdFileExport: (this: Tracker) => void;
  onCmdFileExportText: (this: Tracker) => void;
  onCmdFileCompile: (this: Tracker) => void;
  onCmdPreferences: (this: Tracker) => void;
  onCmdOrnClear: (this: Tracker) => void;
  onCmdOrnCompress: (this: Tracker) => void;
  onCmdOrnExpand: (this: Tracker) => void;
  onCmdOrnPlay: (this: Tracker) => void;
  onCmdOrnShiftLeft: (this: Tracker) => void;
  onCmdOrnShiftRight: (this: Tracker) => void;
  onCmdOrnTransDown: (this: Tracker) => void;
  onCmdOrnTransUp: (this: Tracker) => void;
  onCmdPatCreate: (this: Tracker) => void;
  onCmdPatDup: (this: Tracker) => void;
  onCmdPatDelete: (this: Tracker) => void;
  onCmdPatClean: (this: Tracker) => void;
  onCmdPatCompress: (this: Tracker) => void;
  onCmdPatExpand: (this: Tracker) => void;
  onCmdPosCreate: (this: Tracker) => void;
  onCmdPosDelete: (this: Tracker) => void;
  onCmdPosInsert: (this: Tracker) => void;
  onCmdPosMoveDown: (this: Tracker) => void;
  onCmdPosMoveUp: (this: Tracker) => void;
  onCmdPosPlay: (this: Tracker) => void;
  onCmdPosPlayStart: (this: Tracker) => void;
  onCmdShowDocumentation: (this: Tracker, name: string) => void;
  onCmdSmpClear: (this: Tracker) => void;
  onCmdSmpCopyLR: (this: Tracker) => void;
  onCmdSmpCopyRL: (this: Tracker) => void;
  onCmdSmpDisable: (this: Tracker) => void;
  onCmdSmpEnable: (this: Tracker) => void;
  onCmdSmpLVolDown: (this: Tracker) => void;
  onCmdSmpLVolUp: (this: Tracker) => void;
  onCmdSmpPlay: (this: Tracker) => void;
  onCmdSmpRVolDown: (this: Tracker) => void;
  onCmdSmpRVolUp: (this: Tracker) => void;
  onCmdSmpRotL: (this: Tracker) => void;
  onCmdSmpRotR: (this: Tracker) => void;
  onCmdSmpSwap: (this: Tracker) => void;
  onCmdSongPlay: (this: Tracker) => void;
  onCmdSongPlayStart: (this: Tracker) => void;
  onCmdStop: (this: Tracker) => void;
  onCmdToggleEditMode: (this: Tracker, newState?: boolean) => void;
  onCmdToggleLoop: (this: Tracker, newState?: boolean) => void;
  populateGUI: (this: Tracker, instance: Tracker) => void;
  initializeGUI: (this: Tracker, instance: Tracker) => void;
  handleMouseEvent: (this: Tracker, part: string, obj: any, e: JQueryEventObject) => void;
  hotkeyMap: (this: Tracker, type: HotkeyMapType, group: string, code: string) => (code: string) => void;
  handleHotkeys: (this: Tracker, type: HotkeyMapType, code: string, isInput: boolean, textInput: boolean) => boolean;
  handleKeyEvent: (this: Tracker, event: KeyboardEvent & { target: HTMLElement }) => void;
  getKeynote: (this: Tracker, code: string, octave?: number) => number;

  constructor(public version: string) {
    devLog('Tracker', 'Inizializing SAA1099Tracker v%s...', version);

    /* Dirty hack to get extended prototype into abstract class in TypeScript */
    const app = Object.assign(this, Object.getPrototypeOf(this));

    app.doc.i18nInit();

    app.settings = new Settings(app);
    app.manager = new Manager(app);
    app.tracklist = new Tracklist(app);
    app.smpornedit = new SmpOrnEditor(app);

    app.player = new Player(new SAASound(AudioDriver.sampleRate));
    app.settings.init();
    app.file = new File(app);
    app.compiler = new Compiler(app);

    app.populateGUI(app);
    app.initializeGUI(app);
  }

  baseTimer(this: Tracker) {
    if (this.modePlay && this.player.changedLine) {
      if (!this.player.mode) {
        SyncTimer.pause();
        this.modePlay = false;
        this.globalKeyState.lastPlayMode = 0;
      }
      if (this.player.changedPosition) {
        this.updatePanelPosition();
      }
      this.updatePanelInfo();
      this.updateTracklist();

      this.player.changedPosition = false;
      this.player.changedLine = false;
    }
  }
}
