<div align="center">
  <img src="docs/images/deepseek-office-logo.png" width="144" alt="DeepSeek Office 标识：对话框形办公室中的双人工位">
  <h1>DeepSeek Office</h1>
  <p><strong>和你的 AI 团队，在同一间办公室里工作、开会与休息。</strong></p>
  <p>基于 DeepSeek Harness 的现代 2.5D 办公室模拟，让长期智能体与真实群聊拥有一个可以走进去的空间。</p>
  <p><a href="README.md">English</a> · <strong>简体中文</strong></p>
  <p><code>v0.7.0</code> · <code>Three.js + Phaser</code> · <code>代码采用 Apache-2.0</code></p>
  <p><a href="#highlights">项目亮点</a> · <a href="#screenshots">画面展示</a> · <a href="#quick-start">安装教程</a> · <a href="#how-to-play">怎么玩</a> · <a href="#roadmap">开发计划</a></p>
</div>

<p align="center">
  <img src="docs/images/office-readme-hero.png" width="100%" alt="当前办公室实机画面：同事、工位、会议室、咖啡室与周边绿化">
</p>
<p align="center"><sub>截图来自本地隔离测试团队的实际运行画面。办公室模型与贴图随插件打包。</sub></p>

创建一个团队，给每个人安排职责，然后走进他们的办公室。每个群聊都会变成一层楼：同事拥有自己的工位，会集合开会、共坐沙发，也会起身去喝杯咖啡。他们的工作与对话仍通过原有 Harness 智能体系统运行。

DeepSeek Office 基于 [DS Bot](https://github.com/Fei2411/DeepSeek-Bot)，使用 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的公开插件接口。长期身份、记忆、群聊协作、模型设置和权限控制，都继续属于同一支 AI 团队。

## 0.7.0 更新内容

- **更有生活感的房间**：工作室增加桌垫、文具、台灯或耳机、理线托盘、软木板和地毯；咖啡室增加杯架、咖啡豆罐和植物装饰画；观影房增加吸音板、织物细节、壁灯和电视柜格栅。这些新增装饰位于既有布局内，保留现有界面与互动规则。
- **场景内的手机**：随时打开私聊和群聊，或通过手机里的 Browser 阅读网页；继续使用原有 Session 和原生输入区。
- **对话与导航改进**：当面对话支持立绘和消息历史切换；右上角 HUD 集中地图、镜头、楼层、团队和选项；附近提示与紧凑活动卡支持键盘互动。
- **人物模型更新**：提供的长发角色模型已绑定既有待机、行走、坐姿、喝水和伸展动作，保留独立外观配色。

<a id="highlights"></a>
## 项目亮点

| 体验 | 你可以做什么 |
|---|---|
| **一个群聊，一层办公室** | 为不同团队建立独立楼层。房间位置随群聊固定，成员增加时扩出新的工作室。 |
| **走进会议室，直接在群里开会** | 坐上主位，看同事依次入场，在会议聊天框中发送真实群聊消息。 |
| **认得出每一位同事** | 肤色、发色、上装、下装和鞋子独立搭配，配合行走与坐姿动画形成角色辨识度。 |
| **工作间隙也有小乐趣** | 冲咖啡、翻书、玩接星星街机、准备午餐、调制无酒精饮品，或跟着节奏伸展。 |
| **一起坐进观影房** | 六组三人沙发朝向大曲面电视，同一张沙发上的不同座位可以同时使用。 |
| **有时间感的办公室** | 阳光与傍晚灯光跟随本地时间变化，绿植、庭院和周边城市共同构成环境。 |
| **口袋里的聊天与浏览器** | 点击 **Phone** 或按 `P`，随时打开私聊、群聊和手机网页阅读器，不必走回工位。 |
| **保留原有 AI 团队能力** | 私聊、群聊、记忆、能力库、定时任务和用量统计继续可用；真实工作优先于休闲动画。 |

会议室墙上的展板可以打开完整群聊，查看历史与实时回复。最近的发言会以简短气泡出现在角色头顶，完整文字和附件仍保留在聊天区域。

<a id="screenshots"></a>
## 画面展示

<table>
  <tr>
    <td width="50%" valign="top">
      <strong>围坐一桌，讨论真实任务</strong><br>
      <a href="docs/images/office-meeting.png"><img src="docs/images/office-meeting.png" width="100%" alt="同事围坐会议长桌，下方保留原生群聊输入区域"></a><br>
      你坐主位，八个成员座位依次安排，其余同事整齐站在房间四周。
    </td>
    <td width="50%" valign="top">
      <strong>把完整对话放到展板上</strong><br>
      <a href="docs/images/office-meeting-display.png"><img src="docs/images/office-meeting-display.png" width="100%" alt="画面中央的会议室展板面板，展示完整群聊内容"></a><br>
      墙上展板与会议聊天区使用同一个群聊，保留历史、实时消息和原输入框。
    </td>
  </tr>
  <tr>
    <td width="50%" valign="top">
      <strong>乘电梯，拜访另一层团队</strong><br>
      <a href="docs/images/office-elevator.png"><img src="docs/images/office-elevator.png" width="100%" alt="可走入的电梯与包含楼层、团队信息的选层面板"></a><br>
      进入轿厢、选择目的地，通过关门与场景渐隐渐显完成楼层切换。
    </td>
    <td width="50%" valign="top">
      <strong>留一个座位，一起休息</strong><br>
      <a href="docs/images/office-cinema-shared.png"><img src="docs/images/office-cinema-shared.png" width="100%" alt="曲面电视前的三排沙发，两名同事共坐同一张沙发"></a><br>
      三排等距沙发提供 18 个座位。电视目前显示静态影院插画。
    </td>
  </tr>
</table>

截图记录了功能可用的开发版本，具体房间布局随群聊变化。点击图片可以查看原图。

<a id="quick-start"></a>
## 安装教程

### 1. 准备 Harness

- 安装 DeepSeek Harness。开发测试环境固定使用 **`0.2.0-rc.2`**，当前办公室验收使用 Windows 上的隔离 Web 配置。
- 为 AI 成员配置模型。聊天和可选的 AI 外观、主题设计会使用这些模型设置。
- 使用支持 WebGL 的桌面浏览器或 Harness 桌面端。**运行插件不需要安装 Godot 或 Blender。**

> 本插件在所选配置中替代原版 `ds-bot` / 旧版 `dsh-bot` 团队界面。启用 DeepSeek Office 前，请先禁用原插件，并保留已有团队数据。

### 2. 获取并安装插件包

使用构建产物或已发布版本提供的 `deepseek-office-0.7.0.tgz`。如果尚未提供安装包，可以在下载或克隆本仓库后自行构建。源码构建需要 Node.js **22.19 或更高版本**和 npm：

```sh
cd ds-bot
npm ci
npm run build
node -e "require('node:fs').mkdirSync('../artifacts', { recursive: true })"
npm pack --pack-destination ../artifacts
```

在 **Harness 桌面端**中打开「插件 → 添加插件」，填写安装包的绝对本地路径，安装并启用；如提示重启，请完全退出后重新打开。例如：

```text
C:\plugins\deepseek-office-0.7.0.tgz
```

使用 **Harness Web** 时，需要可用的 pnpm，并将下面的示例替换为实际安装包路径：

```sh
npx @deepseek-ai/dsh@0.2.0-rc.2 plugin --profile web add "/absolute/path/deepseek-office-0.7.0.tgz"
npx @deepseek-ai/dsh@0.2.0-rc.2 web
```

<details>
<summary>发布到 npm 后，如何通过包名安装？</summary>

项目配置的 npm 包名是 `deepseek-office`。所有者将包发布到所选安装源后，可以在「添加插件」中输入 `deepseek-office`，或指定 `deepseek-office@0.7.0`。仅将源码上传到 GitHub 不会自动发布 npm 包；尚未发布时，请使用本地安装包。

插件实际位于仓库的 `ds-bot/` 子目录，因此仓库地址与已发布包名不是相同的安装入口。

</details>

已有 DeepSeek Office 时，在同一配置的插件页面或通过公开 CLI 添加新版安装包，再完全重启 Harness。保留团队数据，继续使用原配置和 `DSH_HOME`。

### 3. 创建第一层办公室

1. 创建至少 **两名 AI 成员**，为他们设置姓名、职责、指令和模型。
2. 新建群聊并添加成员。每群支持 **2～12 名 AI 成员**，你本人不占这个名额。
3. 新群聊会进入对应办公室。侧栏 **Office building** 打开大厅，**Floors** 可以选择要拜访的群聊楼层。
4. 走到同事或设施旁互动，也可以通过 **Team** 直接选择成员。点击 **Back to chat** 随时回到常规聊天。

团队有群聊后才显示办公室入口。尚未创建群聊时，仍可正常使用原有单聊功能。

<a id="how-to-play"></a>
## 前五分钟怎么玩

### 走动、看场景与交流

| 操作 | 功能 |
|---|---|
| 点击地面 | 绕开墙体与家具，走到指定位置 |
| `WASD` / 方向键 | 按屏幕方向移动，旋转镜头后仍保持直觉操作 |
| 按住 `Shift` | 跑步 |
| 靠近人物或物件后按 `E` | 互动 |
| 鼠标滚轮 / 缩放按钮 | 放大或缩小画面 |
| **Rotate view / Overview** | 旋转镜头或查看整层总览 |
| 楼层小地图 / **Follow** | 查看指定房间，再回到人物跟随 |
| **Phone** / `P` | 拿出手机聊天或阅读网页 |
| `Esc` | 关闭当前面板或收起手机 |
| **More → Quiet motion** | 暂停同事自主休闲走动，减少环境动画 |
| **Back to chat** | 退出办公室视图，使用常规聊天 |

### 先开一场会

走入 **Meeting room**，确认 **Start meeting**。你会坐上主位，同事按照成员名单依次进入：有座位的就坐，座位满后整齐站在四周。在下方聊天区发送消息，就像平时在群里聊天一样。

与墙上展板互动，或点击 **Open display**，可以在画面中央查看完整群聊历史。点击 **End meeting** 后起身，同事恢复各自的日常活动。

### 再休息一下，或者换层逛逛

靠近沙发或设施后按 `E`，也可以点击目标旁的互动提示。休息和咖啡会直接开始，其它活动卡会显示对应操作；关闭活动或移动离开即可继续行走。在 **Screening room** 中，多名角色可以使用同一张沙发的不同座位。根据当前楼层的设施，你还可以喝咖啡、翻书、玩一局 30 秒接星星、准备午餐、调制无酒精饮品或做伸展，也可以在走廊和 Momo 打招呼。

点击小地图中的 **Lift** 找到电梯。进入轿厢后，查看楼层信息并选择目的地：电梯关门，当前场景渐隐，目标楼层出现后开门。

### 当面交谈，或拿出手机

靠近同事按 `E`，或通过 **Team** 选择成员。对话框显示立绘和单条发言，可切换查看历史消息。你可以选择私聊或群内提及，原生输入区继续提供附件、语音、模型选择等会话工具。

点击 HUD 地图下方的 **Phone** 或按 `P`。聊天应用列出全部群聊和同事，支持搜索、未读标记和最近消息预览；这些对话与常规聊天使用同一批 Session。手机里的 **Browser** 通过运行 DSH 的电脑及其系统代理抓取网页，以沙盒中的手机布局显示；需要登录、提交表单或复杂脚本的页面可以转到系统浏览器。按 `Esc` 收起手机。玩家持机时停下，世界和智能体回合继续运行。

### 给团队一点自己的风格

选择成员可以查看或重新生成外观；**More → Decorate** 用来调整当前楼层主题，AI 设计可以提出墙面、地板与点缀配色。明确的外观描述也可以影响角色配色。可选的 AI 设计会额外调用模型，已保存的结果会重复使用。

当前 3D 角色共用提供的长发、夹克、裙装和靴子模型，通过独立配色区分身份；原裤装配色通道对应裙装。多种角色模型、家具摆放和房间形状编辑属于后续工作。3D 衣着搭配保存在当前浏览器中。

<a id="floor-layout"></a>
## 楼层怎样生成

每个群聊楼层都有 **一间会议室、一间观影房、两间固定选取的休闲设施，以及一至三间工作室**。休闲设施从咖啡室、阅读室、街机室、厨房、无酒精酒吧和运动室中选取。每间工作室最多四个工位，第五、第九名成员加入时增加工作室，已有房间不搬动。

| AI 成员数 | 工作室数量 | 已布置房间总数，含观影房 |
|---|---:|---:|
| 2～4 人 | 1 间 | 5 间 |
| 5～8 人 | 2 间 | 6 间 |
| 9～12 人 | 3 间 | 7 间 |

前六个房间位置由群聊 ID 确定，因此重新进入同一个群聊时布局保持一致。未使用的位置成为庭院。观影房固定在东侧扩展区域，电梯位于公共走廊右端；大厅另有接待工作室和休闲设施。

<details>
<summary>展开查看当前整层总览</summary>

![当前完整楼层：会议室、观影房、工作室和周边城市绿化](docs/images/office-readme-overview.png)

</details>

<a id="current-scope"></a>
## 当前版本范围

**0.7.0** 在可走动的办公室中整合手机聊天、手机网页阅读器、当面对话，以及工作室、咖啡室和观影房的首轮装饰细化；其它休闲设施保留现有布置。装饰细化保留房间布局、通路、座位、互动目标与现有 UI，群聊消息、智能体工作和权限仍使用原有 Harness 流程。

当前 **尚未实现跨设备联机、角色位置的云端同步、自由建造编辑器或经营经济系统**；观影房电视为静态画面，尚不支持视频播放。3D 场景需要 WebGL。场景内的手机属于桌面玩法，移动设备暂不是主要适配目标。

记忆、权限、工作目录、模型、定时任务和备份等完整说明，见[插件参考文档](ds-bot/README.md)。

<a id="development"></a>
## 开发与验证

```sh
cd ds-bot
npm ci
npm run harness
npm run build
npm test
node scripts/build-client.mjs --check
npm run lint
```

修改 `src/client/` 后重新构建；`client.js` 是需要提交的生成文件。如需使用 mock 模型和项目内测试数据进行隔离预览，请参考[办公室开发说明](ds-bot/README.md#office-development)，测试不得使用日常 Harness 数据目录。

| 内容 | 代码或验证记录 |
|---|---|
| 插件与服务端行为 | [`ds-bot/`](ds-bot/) · [插件参考](ds-bot/README.md) |
| 世界布局、寻路和日常模拟 | [`src/shared/office/`](ds-bot/src/shared/office/) |
| 2.5D 渲染与界面 | [`src/client/office/`](ds-bot/src/client/office/) · [渲染验证](docs/office-25d-verification.md) |
| 人物与外观辨识 | [人物验证](docs/office-character-verification.md) |
| 会议、历史和群聊输入框 | [会议室验证](docs/office-meeting-verification.md) |
| 跨层移动与观影座位 | [电梯验证](docs/office-elevator-verification.md) · [观影房验证](docs/office-cinema-verification.md) |
| 手机、对话与房间细节 | [手机设计](docs/plans/2026-10-21-office-phone.md) · [对话框设计](docs/plans/2026-10-20-visual-novel-dialogue.md) · [装饰范围](docs/plans/2026-10-21-office-decoration.md) |

## 致谢与许可

项目建立在 [DS Bot](https://github.com/Fei2411/DeepSeek-Bot) 和 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 之上。代码保留项目的 [Apache-2.0 许可](LICENSE)、[NOTICE](NOTICE) 和[第三方说明](ds-bot/THIRD-PARTY-NOTICES.txt)。

Three.js 与 Phaser 提供渲染和模拟基础，建筑、房间构图与界面由本分支实现。人物、电梯和电视来自所有者提供的模型，其来源分别记录在 [office-worker](ds-bot/src/client/assets/office-worker/SOURCES.md)、[elevator](ds-bot/src/client/assets/elevator/SOURCES.md) 和 [cinema](ds-bot/src/client/assets/cinema/SOURCES.md)，不额外声明第三方授权。Momo 使用 Pixel-Boy / Sparklin Labs 的 CC0 Ninja Adventure 素材；保留的 LPC 资源继续遵守原有[许可与署名](ds-bot/src/client/assets/lpc/SOURCES.md)。

新版项目 Logo 为原创 AI 生成图形，见[品牌来源与提示词](docs/branding/SOURCES.md)。本项目为独立社区项目。

<a id="roadmap"></a>
## 后续开发计划

以下为开发方向，尚未包含在当前发布版本中。

- [ ] **跨设备联机**：实现共享房间、在线状态、玩家移动与外观同步、断线重连及会话权限，让不同电脑上的用户进入同一间办公室。
- [ ] **场景美化**：将工作室、咖啡室和观影房的现有细化扩展到其它设施、庭院和建筑，扩充人物体型、服装款式与动画质量。
- [ ] **互动细化**：完善接近、转身、坐下和起身衔接，增加设施互动、会议反馈，以及观影房的视频播放与控制。
- [ ] **用户自定义场景**：支持摆放家具、调整房间布局、选择装修风格、保存可复用的楼层模板，并进一步探索 AI 辅助场景设计。
