/**
 * Everything in this file is generated by the 'tools/generate-operator-patches.ts' script.
 * Any manual edits to this file will be lost next time the script is run.
 **/
import {Observable} from '../../Observable';
import {debounceTime} from '../../operator/debounceTime';

Observable.prototype.debounceTime = debounceTime;

export var _void: void;