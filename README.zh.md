# DeepSeek Office

[English](README.md) | 中文

基于 [DeepSeek-Office](https://github.com/wyx135230/DeepSeek-Office) 和 DS Bot 改造的个人版 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件。保留原有智能体团队和聊天，同时让你走进温暖的像素工作室。

![像素办公室](docs/images/pixel-office.png)

## 团队有了自己的小楼

- 一个群聊就是一层办公室。大厅目录展示每层的名称、用途、工位数和工作状态。
- 群聊增加或移除成员，办公室同步增加或移除工位；在界面中新建群聊会自动进入它的办公室。
- 每层通过走廊连接独立房间，带实体围墙与自动开关的门。每间工作室最多 4 个工位，第 5、9 位成员会增加相连工作室。楼层种子稳定选取咖啡馆、图书馆、街机室、餐厅、无酒精酒吧、健身房中的三种设施，不同楼层的位置、组合和材质各异。
- 96 套稳定角色组合覆盖八种发型、四种肤色、四种服装和两种成人体型；新员工根据身份选取并保持外观。全身角色使用 LPC 作者配套的身体、服装、头部与头发图层，保留原始 64 × 64 帧对齐和作者绘制的行走、待机、坐姿动画。AI 服装配色应用到衬衫；真实 Harness 工作优先于咖啡、阅读、街机与简短社交问候。
- 可以冲泡咖啡并观看准备与品尝过程，从三本原创短书中选择并翻页阅读，玩 30 秒 Star catcher 接星星街机游戏、按顺序准备午餐碗、踩点调制无酒精饮品，或完成六次节奏伸展。每间办公室分别保存街机最高分；关闭活动面板即可回到房间。
- 点击地面绕过家具走动，或使用 WASD / 方向键；按住 Shift 跑步，靠近角色或物件后按 E 互动。所有楼层保持相同的 2 倍人物缩放，镜头沿连通房间平移。左侧小地图显示布局和移动人员，点击或拖动即可查看区域；点击 Follow 或移动人物恢复跟随。
- 可以在场景中与同事对话、群聊点名或打开私聊；Team 菜单也提供可通过键盘直接进入的对话入口。
- 画布周围使用清晰的 Segoe UI／系统字体界面。附近角色名与简短对白使用固定屏幕字号的 HTML 文本；环境问候只属于场景，不会调用模型或发送群消息。
- 使用智能体已配置的模型生成并保存像素肖像与服装配色；配色也应用到四方向游戏角色。可以描述新外观重新生成，失败时保留已有或内置角色。
- 支持白天、月夜预设，以及 AI 设计办公室配色与氛围；每层独立保存。
- 没有群聊时不显示办公室入口和场景，单聊保持原版体验；随时可以返回聊天界面。

保留原项目的长期智能体、群聊协作、记忆、模型选择、权限控制、能力库、定时任务和用量统计，详见[插件参考](ds-bot/README.md)。

当前版本先适配电脑端，以键盘和鼠标操作为验收目标；手机适配暂缓。

## 安装本地版本

已在 DSH `0.2.0-rc.2` 上验证。先在 DSH 中配置至少一个模型，用于聊天和 AI 设计。本分支的 npm 包名为 `deepseek-office`；发布个人版本前，请使用本地安装包。

这是原版 `ds-bot` 的替代版本。请在目标 DSH 配置中先禁用或移除原版 `ds-bot` / 旧版 `dsh-bot` 插件，再启用本插件，保留已有团队数据。两个版本沿用同一个内部团队标识和存储格式，不要同时启用。

**DSH Desktop**

1. 打开「插件」→「添加插件」。
2. 填入本次构建 `artifacts/` 目录中 `deepseek-office-0.4.0.tgz` 的绝对路径。
3. 安装并启用；如果提示重启，请完全退出 DSH 再打开。
4. 新建群聊会自动进入办公室；侧栏的 **Office building** 打开大厅。

**DSH Web**

需要 Node.js 22.19 以上和 pnpm，将示例替换为本地安装包的实际路径：

```sh
npx @deepseek-ai/dsh@0.2.0-rc.2 plugin --profile web add "/absolute/path/deepseek-office-0.4.0.tgz"
npx @deepseek-ai/dsh@0.2.0-rc.2 web
```

## AI 设计与当前范围

形象生成通过 Harness 调用该智能体配置的文本模型，返回经过校验的 16 × 24 像素数据和调色板。首次进入办公室时，缺少形象的成员依次生成，保存后重复使用。重新生成角色、AI 设计房间都会额外调用模型并消耗 token。效果取决于模型能力和可用性；失败时保留已有或内置形象，可以手动重试。

当前房间定制支持墙面、地板、点缀配色和昼夜氛围。房间与家具采用稳定种子的连通设施模板。定制家具美术已随包提供；尚未接入在线生成任意房间几何或动画的功能。

游戏场景使用本地打包的 Phaser 4.2.1，接入 Arcade Physics、四方向精灵动画、避障寻路和固定人物比例的跟随镜头与交互小地图；只在进入办公室时启动，优先使用 WebGL，并支持 Canvas 回退。关闭办公室会销毁游戏和事件监听。Quiet motion 停止咖啡蒸汽、屏幕光标与自主休闲／社交走动，保留玩家操作。打开活动面板时玩家停留原地，同事仍继续各自的日程；真实工作会打断同事的休息。插件界面统一为英文，不随 Harness 外壳语言切换；你填写的名称和聊天内容保持原样。

## 开发

源码位于 [ds-bot/](ds-bot/)，设计说明见[园区架构与素材制作流程](docs/office-campus.md)，验证结果与限制见[验收记录](docs/verification.md)。

```sh
cd ds-bot
npm ci
npm run harness
npm run build
npm test
node scripts/build-client.mjs --check
npm run lint
npm pack --pack-destination ../artifacts
```

隔离预览使用 `node dev/office-bench.mjs`，默认端口 3106/8806，使用模拟模型和项目内的 `.dsh-test-office/` 数据，不使用日常 DSH 数据。首次使用需要将插件安装进该测试配置，见[开发说明](ds-bot/README.md#office-development)。按 Ctrl+C 停止。

安装包不包含密钥、聊天记录或模型。团队数据保留在目标 DSH 数据目录的 `bot/` 与 `sessions/` 中，卸载插件不会删除。

## 来源与许可

本地修改基于 wyx135230/DeepSeek-Office main 提交 `939a6635830cb5b246e7dd19c67b0e1352ad1c07`，项目源于 [DS Bot](https://github.com/Fei2411/DeepSeek-Bot)。保留原作者版权与 Apache-2.0 许可，见 [LICENSE](LICENSE)、[NOTICE](NOTICE)。

Phaser 与内嵌组件的许可见 [THIRD-PARTY-NOTICES](ds-bot/THIRD-PARTY-NOTICES.txt)。Eliza Wyatt 与 LPC 贡献者的 LPC Revised 美术素材采用 OGA-BY 3.0，来源为 [ElizaWy/LPC](https://github.com/ElizaWy/LPC)，固定提交 `f07f7f5892e67c932c68f70bb04472f2c64e46bc`；[LPC 来源说明](ds-bot/src/client/assets/lpc/SOURCES.md) 列出文件映射、作者署名和许可。原始 PNG 保持不变；运行时合成角色图层、调整衬衫配色，并裁切／缩放家具。[96 套角色库](ds-bot/src/client/assets/lpc-cast/SOURCES.md) 保留新增图层的分类署名；[定制设施图集](ds-bot/src/client/assets/custom/SOURCES.md) 记录生成方法和后续复用规范。房间组合、街机叠加图形、短书和界面代码由本分支原创。

Momo 使用 Pixel-Boy / Sparklin Labs 的 CC0 [Ninja Adventure](https://github.com/sparklinlabs/superpowers-asset-packs/tree/master/ninja-adventure) 素材，[Ninja 来源说明](ds-bot/src/client/assets/ninja/SOURCES.md) 固定了来源提交。交互设计参考了 [Pixel Agents](https://github.com/pixel-agents-hq/pixel-agents) 和 [Star Office UI](https://github.com/ringhyacinth/Star-Office-UI) 的公开活动可视化思路，未使用其代码或美术素材。
