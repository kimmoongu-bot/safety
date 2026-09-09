import { AppRegistry } from 'react-native';
import { registerRootComponent } from 'expo';
import App from './App';
import FillApp from './src/app/FillApp.tsx';

registerRootComponent(App);

/*
  채우기 화면 (docs/자동완성.md 3단계).

  다른 앱의 로그인 칸에서 잠김을 누르면 뜨는 화면이다. 안드로이드가 결과를 받아
  가려면 액티비티가 따로 있어야 하고, 그 액티비티는 자기 리액트 뿌리가 필요하다.
  자바스크립트는 한 벌이라 금고도 설정도 같은 것을 쓴다.

  이름 `JamgimFill` 은 JamgimFillActivity 의 getMainComponentName() 과 **같아야 한다.**
  다르면 그 화면이 빈 채로 뜬다.
*/
AppRegistry.registerComponent('JamgimFill', () => FillApp);
