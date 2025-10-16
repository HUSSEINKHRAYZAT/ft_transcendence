import WebModule from './WebModule.png';
import UserManagment from './UserManagment.png';
import GamePlay from './GamePlay.png';
import AiAlgo from './AiAlgo.png';
import Cybersecurity from './Cybersecurity.png';
import DevOps from './DevOps.png';
import Graphics from './Graphics.png';
import Accessibility from './Accessibility.png';
import ServerSidePong from './ServerSidePong.png';
import TrueIcon from './True.png';
import FalseIcon from './False.png';

export const infoImages = {
  webModule: WebModule,
  userManagement: UserManagment,
  gameplay: GamePlay,
  aiAlgo: AiAlgo,
  cybersecurity: Cybersecurity,
  devops: DevOps,
  graphics: Graphics,
  accessibility: Accessibility,
  serverSidePong: ServerSidePong,
  completed: TrueIcon,
  notCompleted: FalseIcon,
};

export type InfoImageKey = keyof typeof infoImages;
