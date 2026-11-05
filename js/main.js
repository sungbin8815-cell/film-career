import { mount, showTitle } from './ui.js'
import * as E from './engine.js'

mount(document.getElementById('app'))
showTitle()

// 테스트용: 주소 끝에 ?debug 를 붙이면 콘솔에서 window.__game 으로 엔진을 조작할 수 있습니다.
if (new URLSearchParams(location.search).has('debug')) window.__game = E
