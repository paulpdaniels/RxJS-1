/* globals describe, it, expect, hot, cold, expectObservable, expectSubscriptions */
var Rx = require('../../dist/cjs/Rx');
var Observable = Rx.Observable;

describe('Observable.prototype.bufferToggle', function () {
  it.asDiagram('bufferToggle')('should emit buffers using hot openings and hot closings', function () {
    var e1 =   hot('---a---b---c---d---e---f---g---|');
    var e2 =   hot('--o------------------o---------|');
    var e3 =   hot('---------c---------------c-----|');
    var expected = '---------x---------------y-----|';
    var values = {
      x: ['a','b'],
      y: ['f'],
    };

    var result = e1.bufferToggle(e2, function (x) { return e3; });

    expectObservable(result).toBe(expected, values);
  });

  it('should emit buffers that are opened by an observable from the first argument ' +
      'and closed by an observable returned by the function in the second argument',
  function () {
    var e1 =   hot('-----a----b----c----d----e----f----g----h----i----|');
    var e2 =  cold('-------------x-------------y--------------z-------|');
    var e3 =               cold('---------------(j|)');
    //                                         ---------------(j|)
    //                                                        ---------------(j|)
    var expected = '----------------------------q-------------r-------(s|)';

    var values = {
      q: ['c','d','e'],
      r: ['f','g','h'],
      s: ['i']
    };
    var innerVals = ['x', 'y', 'z'];

    expectObservable(e1.bufferToggle(e2, function (x) {
      expect(x).toBe(innerVals.shift());
      return e3;
    })).toBe(expected, values);
  });

  it('should emit buffers using varying cold closings', function () {
    var e1 = hot('--a--^---b---c---d---e---f---g---h------|      ');
    var e2 =     cold('--x-----------y--------z---|              ');
    var subs =        '^                                  !      ';
    var closings = [
      cold(             '---------------s--|                     '),
      cold(                         '----(s|)                    '),
      cold(                                  '---------------(s|)')];
    var closeSubs =  ['  ^              !                        ',
                      '              ^   !                       ',
                      '                       ^           !      '];
    var expected =    '-----------------ij----------------(k|)   ';
    var values = {
      i: ['b','c','d','e'],
      j: ['e'],
      k: ['g','h']
    };

    var i = 0;
    var result = e1.bufferToggle(e2, function () { return closings[i++]; });

    expectObservable(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(subs);
    expectSubscriptions(closings[0].subscriptions).toBe(closeSubs[0]);
    expectSubscriptions(closings[1].subscriptions).toBe(closeSubs[1]);
    expectSubscriptions(closings[2].subscriptions).toBe(closeSubs[2]);
  });

  it('should emit buffers using varying hot closings', function () {
    var e1 = hot('--a--^---b---c---d---e---f---g---h------|   ');
    var e2 =     cold('--x-----------y--------z---|           ');
    var subs =        '^                                  !   ';
    var closings = [
      {obs: hot(  '-1--^----------------s-|                   '), // eslint-disable-line key-spacing
       sub:           '  ^              !                     '}, // eslint-disable-line key-spacing
      {obs: hot(      '-----3----4-------(s|)                 '), // eslint-disable-line key-spacing
       sub:           '              ^   !                    '}, // eslint-disable-line key-spacing
      {obs: hot(      '-------3----4-------5----------------s|'), // eslint-disable-line key-spacing
       sub:           '                       ^           !   '}]; // eslint-disable-line key-spacing
    var expected =    '-----------------ij----------------(k|)';
    var values = {
      i: ['b','c','d','e'],
      j: ['e'],
      k: ['g','h']
    };

    var i = 0;
    var result = e1.bufferToggle(e2, function () { return closings[i++].obs; });

    expectObservable(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(subs);
    for (var j = 0; j < closings.length; j++) {
      expectSubscriptions(closings[j].obs.subscriptions).toBe(closings[j].sub);
    }
  });

  it('should emit buffers using varying empty delayed closings', function () {
    var e1 = hot('--a--^---b---c---d---e---f---g---h------|   ');
    var e2 =     cold('--x-----------y--------z---|           ');
    var subs =        '^                                  !   ';
    var closings = [
      cold(             '---------------|                     '),
      cold(                         '----|                    '),
      cold(                                  '---------------|')];
    var expected =    '-----------------ij----------------(k|)';
    var values = {
      i: ['b','c','d','e'],
      j: ['e'],
      k: ['g','h']
    };

    var i = 0;
    var result = e1.bufferToggle(e2, function () { return closings[i++]; });

    expectObservable(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should emit buffers using varying cold closings, outer unsubscribed early', function () {
    var e1 = hot('--a--^---b---c---d---e---f---g---h------|      ');
    var subs =        '^         !                               ';
    var e2 =     cold('--x-----------y--------z---|              ');
    var closings = [
      cold(             '---------------s--|                     '),
      cold(                         '----(s|)                    '),
      cold(                                  '---------------(s|)')];
    var csub0 =       '  ^       !                               ';
    var expected =    '-----------                               ';
    var unsub =       '          !                               ';
    var values = {
      i: ['b','c','d','e']
    };

    var i = 0;
    var result = e1.bufferToggle(e2, function () { return closings[i++]; });

    expectObservable(result, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(subs);
    expectSubscriptions(closings[0].subscriptions).toBe(csub0);
    expectSubscriptions(closings[1].subscriptions).toBe([]);
    expectSubscriptions(closings[2].subscriptions).toBe([]);
  });

  it('should not break unsubscription chains when result is unsubscribed explicitly', function () {
    var e1 = hot('--a--^---b---c---d---e---f---g---h------|      ');
    var subs =        '^                 !                       ';
    var e2 =     cold('--x-----------y--------z---|              ');
    var closings = [
      cold(             '---------------s--|                     '),
      cold(                         '----(s|)                    '),
      cold(                                  '---------------(s|)')];
    var expected =    '-----------------i-                       ';
    var unsub =       '                  !                       ';
    var values = {
      i: ['b','c','d','e']
    };

    var i = 0;
    var result = e1
      .mergeMap(function (x) { return Observable.of(x); })
      .bufferToggle(e2, function () { return closings[i++]; })
      .mergeMap(function (x) { return Observable.of(x); });

    expectObservable(result, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should propagate error thrown from closingSelector', function () {
    var e1 = hot('--a--^---b---c---d---e---f---g---h------|      ');
    var e2 =     cold('--x-----------y--------z---|              ');
    var subs =        '^             !                           ';
    var closings = [
      cold(             '---------------s--|                     '),
      cold(                         '----(s|)                    '),
      cold(                                  '---------------(s|)')];
    var closeSubs0 =  '  ^           !                           ';
    var expected =    '--------------#                           ';

    var i = 0;
    var result = e1.bufferToggle(e2, function () {
      if (i === 1) {
        throw 'error';
      }
      return closings[i++];
    });

    expectObservable(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
    expectSubscriptions(closings[0].subscriptions).toBe(closeSubs0);
    expectSubscriptions(closings[1].subscriptions).toBe([]);
    expectSubscriptions(closings[2].subscriptions).toBe([]);
  });

  it('should propagate error emitted from a closing', function () {
    var e1 = hot('--a--^---b---c---d---e---f---g---h------|');
    var e2 =     cold('--x-----------y--------z---|        ');
    var subs =        '^             !                     ';
    var closings = [
      cold(             '---------------s--|               '),
      cold(                         '#                     ')];
    var closeSubs =  ['  ^           !                     ',
                      '              (^!)                  '];
    var expected =    '--------------#                     ';

    var i = 0;
    var result = e1.bufferToggle(e2, function () { return closings[i++]; });

    expectObservable(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(subs);
    expectSubscriptions(closings[0].subscriptions).toBe(closeSubs[0]);
    expectSubscriptions(closings[1].subscriptions).toBe(closeSubs[1]);
  });

  it('should propagate error emitted late from a closing', function () {
    var e1 = hot('--a--^---b---c---d---e---f---g---h------|');
    var e2 =     cold('--x-----------y--------z---|        ');
    var subs =        '^                  !                ';
    var closings = [
      cold(             '---------------s--|               '),
      cold(                         '-----#                ')];
    var closeSubs =  ['  ^              !                  ',
                      '              ^    !                '];
    var expected =    '-----------------i-#                ';
    var values = {
      i: ['b','c','d','e']
    };

    var i = 0;
    var result = e1.bufferToggle(e2, function () { return closings[i++]; });

    expectObservable(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(subs);
    expectSubscriptions(closings[0].subscriptions).toBe(closeSubs[0]);
    expectSubscriptions(closings[1].subscriptions).toBe(closeSubs[1]);
  });

  it('should handle errors', function () {
    var e1 = hot('--a--^---b---c---d---e--#        ');
    var e2 =     cold('--x-----------y--------z---|');
    var subs =        '^                  !        ';
    var closings = [
      cold(             '---------------s--|       '),
      cold(                         '-------s|     ')];
    var closeSubs =  ['  ^              !                  ',
                      '              ^    !                '];
    var expected =    '-----------------i-#        ';
    var values = {
      i: ['b','c','d','e']
    };

    var i = 0;
    var result = e1.bufferToggle(e2, function () { return closings[i++]; });

    expectObservable(result).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(subs);
    expectSubscriptions(closings[0].subscriptions).toBe(closeSubs[0]);
    expectSubscriptions(closings[1].subscriptions).toBe(closeSubs[1]);
  });

  it('should handle empty source', function () {
    var e1 =  cold('|');
    var e2 =  cold('--o-----|');
    var e3 =  cold(  '-----c--|');
    var expected = '|';
    var values = { x: [] };

    var result = e1.bufferToggle(e2, function () { return e3; });

    expectObservable(result).toBe(expected, values);
  });

  it('should handle throw', function () {
    var e1 =  cold('#');
    var e2 =  cold('--o-----|');
    var e3 =  cold(  '-----c--|');
    var expected = '#';
    var values = { x: [] };

    var result = e1.bufferToggle(e2, function () { return e3; });

    expectObservable(result).toBe(expected, values);
  });

  it('should handle never', function () {
    var e1 =   hot('-');
    var e2 =  cold('--o-----o------o-----o---o-----|');
    var e3 =  cold(  '--c-|');
    var unsub =    '                                            !';
    var subs =     '^                                           !';
    var expected = '----x-----x------x-----x---x-----------------';
    var values = { x: [] };

    var result = e1.bufferToggle(e2, function () { return e3; });

    expectObservable(result, unsub).toBe(expected, values);
    expectSubscriptions(e1.subscriptions).toBe(subs);
  });

  it('should handle a never opening Observable', function () {
    var e1 = hot('--a--^---b---c---d---e---f---g---h------|');
    var e2 = cold(    '-');
    var e3 =  cold(   '--c-|');
    var expected =    '-----------------------------------|';

    var result = e1.bufferToggle(e2, function () { return e3; });

    expectObservable(result).toBe(expected);
  });

  it('should handle a never closing Observable', function () {
    var e1 = hot('--a--^---b---c---d---e---f---g---h------|');
    var e2 = cold(    '---o---------------o-----------|');
    var e3 =  cold('-');
    var expected =    '-----------------------------------(xy|)';
    var values = {
      x: ['b', 'c', 'd', 'e', 'f', 'g', 'h'],
      y: ['f', 'g', 'h']
    };

    var result = e1.bufferToggle(e2, function () { return e3; });

    expectObservable(result).toBe(expected, values);
  });

  it('should handle opening Observable that just throws', function () {
    var e1 = hot('--a--^---b---c---d---e---f---g---h------|');
    var e1subs =      '(^!)';
    var e2 = cold(    '#');
    var e2subs =      '(^!)';
    var e3 = cold(    '--c-|');
    var expected =    '#';

    var result = e1.bufferToggle(e2, function () { return e3; });

    expectObservable(result).toBe(expected);
    expectSubscriptions(e1.subscriptions).toBe(e1subs);
    expectSubscriptions(e2.subscriptions).toBe(e2subs);
  });
});