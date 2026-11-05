import type { Language } from "./language";

// Korean source copy is the key. Entries contain English, Japanese and simplified Chinese.
const rows = `
서울 서대문구 연희동 170-181|170-181 Yeonhui-dong, Seodaemun-gu, Seoul|ソウル市西大門区延禧洞170-181|首尔西大门区延禧洞170-181
이미 가입된 이메일이에요|This email is already registered.|このメールアドレスは登録済みです。|此邮箱已注册。
이메일 또는 비밀번호를 확인해 주세요|Check your email or password.|メールアドレスとパスワードを確認してください。|请检查邮箱或密码。
가입하지 못했어요. 다시 시도해 주세요.|Couldn't create the account. Please try again.|登録できませんでした。もう一度お試しください。|无法注册，请重试。
서버 오류가 발생했어요. 잠시 후 다시 시도해 주세요.|A server error occurred. Please try again shortly.|サーバーエラーです。しばらくしてからお試しください。|服务器发生错误，请稍后重试。
AR로 이 자리에 놓아 보기|Place here in AR|ARでここに置く|通过AR放在这里
구 신촌역사에서 출발하는 옛 기차표를 본뜬 고리예요. 신촌에서 찍은 사진과 그날의 이야기를 한 장의 왕복표에 담아보세요.|Inspired by an old train ticket from Sinchon Station. Keep your photo and story in a return ticket.|旧新村駅発の切符を模したゴリです。写真と物語を一枚の往復切符に残しましょう。|以旧新村站的车票为灵感，将照片与故事装进一张往返票。
박물관 중앙홀의 아크로칸토사우루스 골격을 담은 발굴함이에요. 뚜껑을 열면 공룡 뼈와 함께 그날의 기록이 드러나요.|A discovery box inspired by the museum's Acrocanthosaurus skeleton. Lift the lid to reveal your memory.|博物館のアクロカントサウルス骨格を収めた発掘箱です。ふたを開くと思い出が現れます。|以博物馆中的高棘龙骨架为灵感，打开盒盖便能看到那天的记录。
문화비축기지의 둥근 석유탱크와 셔터를 작게 옮겼어요. 빨간 손바퀴를 돌리면 셔터가 열리고 안에 넣어 둔 기록을 볼 수 있어요.|A miniature oil tank from Oil Tank Culture Park. Turn the red wheel to reveal the memory inside.|文化備蓄基地の石油タンクを小さくしました。赤いハンドルを回すと記録が現れます。|将文化储备基地的油罐化作微缩模型，转动红色手轮即可查看记录。
서울함공원에 전시된 잠망경을 본떴어요. 한강을 바라보던 자리에서 눈에 들어온 장면을 사진으로 남겨보세요.|Inspired by a periscope at Seoul Battleship Park. Save a scene from your view of the Hangang.|ソウル艦公園の潜望鏡を模しました。漢江を眺めた場所の風景を残しましょう。|仿照首尔舰公园的潜望镜，留下眺望汉江时眼前的风景。
여러 색의 천 조각을 이어 만든 조각보에서 따왔어요. 매듭을 풀면 보자기 안에 싸 두었던 사진과 한 줄이 나타나요.|Inspired by colorful Korean patchwork. Untie the knot to reveal a photo and a few words.|色とりどりの布をつなぐポジャギから。結び目をほどくと写真と言葉が現れます。|源自彩色韩式拼布，解开结便能看到包裹的照片与文字。
우리소리를 담았던 카세트테이프와 투명 케이스를 본떴어요. 그날 들은 소리 중 기억하고 싶은 하나를 글로 남겨보세요.|A cassette and clear case inspired by Korean folk sounds. Write about a sound you want to remember.|韓国の音を収めたカセットを模しました。覚えておきたい音を言葉で残しましょう。|以承载韩国声音的磁带为造型，用文字留下想记住的声音。
화폐박물관의 금고에서 따온 고리예요. 다이얼을 돌려 문을 열면 그날 넣어 둔 사진과 글이 나타나요.|Inspired by a vault at the Money Museum. Turn the dial to open your photo and story.|貨幣博物館の金庫から生まれたゴリです。ダイヤルを回すと写真と言葉が現れます。|灵感来自货币博物馆的保险箱，转动密码盘开启照片与文字。
오래된 영화 필름 통에 명동예술극장의 아치형 창 모양을 더했어요. 오늘 본 공연에서 오래 기억하고 싶은 한 장면을 담아보세요.|A film canister with Myeongdong Theater's arched window. Keep a scene from today's performance.|フィルム缶に明洞芸術劇場のアーチ窓を添えました。今日の舞台の一場面を残しましょう。|旧胶片盒融入明洞艺术剧场的拱窗造型，保存今天演出中难忘的一幕。
오목한 기와 두 장 사이를 둥근 기와 한 장이 덮는 한옥 지붕의 구조를 본떴어요. 가운데 기와를 밀면 그 아래 감춰 둔 기록이 나타나요.|Inspired by interlocking hanok roof tiles. Slide the center tile to reveal your hidden memory.|韓屋の瓦の重なりを模しました。中央の瓦を滑らせると記録が現れます。|仿照韩屋屋瓦的交叠结构，滑开中间的瓦片即可查看记录。
칠성각에서 발견된 옛 신문이 싸인 채 보존됐던 이야기에서 출발했어요. 접은 한지 사이에 진관사에서 남기고 싶은 한 줄을 넣어보세요.|Inspired by old newspapers preserved in Chilseonggak Hall. Leave your words between folded hanji sheets.|七星閣で保存されていた古い新聞の物語から。折った韓紙の間に言葉を残しましょう。|源于七星阁保存旧报纸的故事，在折叠的韩纸间留下想说的话。
남산의 사랑의 자물쇠를 떠올리며 만든 붉은 하트 고리예요. 함께 온 사람에게 전하고 싶은 말을 사진과 함께 잠가 두세요.|A red heart inspired by Namsan's love locks. Keep a photo and a message for someone special.|南山の愛の南京錠を思わせる赤いハート。大切な人への言葉を写真と一緒に残しましょう。|红色爱心源于南山爱情锁，将想对同行者说的话与照片一起封存。
윤동주 친필 원고의 세로로 놓인 글줄을 본뜬 원고첩이에요. 표지를 열고 오늘 오래 기억하고 싶은 문장 하나를 적어보세요.|A manuscript book inspired by Yun Dong-ju's handwriting. Open it and leave a sentence to remember.|尹東柱の直筆原稿を模した原稿帳です。今日覚えておきたい一文を残しましょう。|以尹东柱手稿为灵感的手稿册，写下一句今天想长久记住的话。
안산 봉수대의 돌단과 아궁이를 본떠 만든 고리예요. 석판을 밀면 작은 불씨와 함께 그날 안산에서 남긴 기록이 드러나요.|Inspired by Ansan's stone beacon. Slide the stone to reveal an ember and your memory.|鞍山烽燧台の石段とかまどを模しました。石板を滑らせると火種と思い出が現れます。|仿照鞍山烽燧台的石台与炉膛，滑开石板便会显露火种与回忆。
역사관의 붉은 벽돌과 전시 기록물에서 색과 형태를 가져온 편지예요. 전시를 보고 오래 기억하고 싶은 이름과 이야기를 고리에 남겨보세요.|Inspired by the history hall's red bricks and exhibits. Keep the names and stories you want to remember.|歴史館の赤レンガと展示資料から生まれた手紙です。覚えておきたい名前と物語を残しましょう。|以历史馆的红砖与展品为灵感，将想铭记的名字和故事留在Gori中。
가까운 장소를 찾고 있어요…|Finding nearby places…|近くの場所を探しています…|正在查找附近地点…
이 자리에 맡겨 둔 약속|A promise kept here|この場所に預けた約束|寄存在这里的约定
설렘|Anticipation|ときめき|期待
약속|Promise|約束|约定
서울|Seoul|ソウル|首尔
다시 만나요, 이 자리에서|Let's meet here again|また会いましょう、この場所で|在这里再次相见
이 자리에 다시 오면 열려요|Return to this spot to open it.|この場所に戻ると開けられます|回到这里即可开启
1년 뒤 오늘, 이 자리에서 열려요|Open here on this day next year.|1年後の今日、この場所で開きます|明年今日在这里开启
(예시 응답) 같은 자리로 판정했어요|(Demo response) This appears to be the same spot.|（デモ応答）同じ場所と判定しました。|（演示回复）判定为同一地点。
그날 이 자리에 남긴 기억을 다시 꺼냈어요. 그 사이 계절이 바뀌었네요. 지금의 고리도 하나 더 걸어 볼까요?|You've opened the memory you left here. The season has changed. Would you like to leave another Gori?|あの日ここに残した思い出を開きました。季節が変わりましたね。今のゴリも残してみませんか？|你打开了那天留在这里的回忆，季节已悄然变换。要再留下今天的Gori吗？
위치 권한을 허용해야 기억을 열 수 있어요|Allow location access to open this memory.|思い出を開くには位置情報を許可してください。|请允许位置权限以开启回忆。
{date}부터 열려요|Opens from {date}|{date}から開けられます|从{date}起可以开启
{place}에서 {distance}m 떨어져 있어요. {radius}m 안으로 와서 다시 찍어 주세요|You are {distance}m from {place}. Come within {radius}m and take another photo.|{place}から{distance}m離れています。{radius}m以内でもう一度撮影してください。|距离{place}还有{distance}米，请进入{radius}米范围后重新拍摄。
기기 정보와 지금 찍은 사진이 필요해요|Device information and a current photo are required.|端末情報と今撮った写真が必要です。|需要设备信息和当前拍摄的照片。
없는 기억이에요|Memory not found.|思い出が見つかりません。|找不到这段回忆。
내가 남긴 기억만 열 수 있어요|You can only open your own memories.|自分の思い出だけ開けられます。|只能开启自己留下的回忆。
기억을 열지 못했어요|Couldn't open the memory.|思い出を開けませんでした。|无法开启回忆。
잠시 후 다시 시도해주세요.|Please try again shortly.|しばらくしてからお試しください。|请稍后重试。
뒤로|Back|戻る|返回
홈|Home|ホーム|首页
추억|Memories|思い出|回忆
고리|Gori|ゴリ|Gori
수집|Collection|収集|收藏
마이|My page|マイページ|我的
궁궐 · 한국 전통 장소|Palace · Korean heritage|宮殿・韓国の伝統|宫殿·韩国传统
서울 종로구 사직로 161|161 Sajik-ro, Jongno-gu, Seoul|ソウル市鍾路区社稷路161|首尔钟路区社稷路161
역사 유적 · 독립공원|Historic site · Independence Park|史跡・独立公園|历史遗迹·独立公园
서울 서대문구 통일로 251|251 Tongil-ro, Seodaemun-gu, Seoul|ソウル市西大門区統一路251|首尔西大门区统一路251
대학 캠퍼스|University campus|大学キャンパス|大学校园
서울 서대문구 거북골로 34|34 Geobukgol-ro, Seodaemun-gu, Seoul|ソウル市西大門区コブッコル路34|首尔西大门区Geobukgol路34
고리를 남기는|Leave a Gori,|ゴリを残す、|留下Gori，
가장 가까운 여행|a little journey nearby|身近な旅へ|开启身边的旅行
오늘도 우리만의 장소로|Back to a place of our own|今日も私たちだけの場所へ|今天也去属于我们的地方
주변 둘러보기|Explore nearby|周辺を探す|探索附近
우리 동네, 새로운 기억|Nearby places, new memories|身近な場所、新しい思い出|身边的地方，新的回忆
지도에서 주변 장소 보기|Explore nearby places on the map|地図で周辺の場所を見る|在地图上查看附近地点
오늘의 고리를|Where will you|今日のゴリを|今天的Gori，
어디에 남길까요?|leave today's Gori?|どこに残しますか？|想留在哪里？
가까운 장소 더 보기|More nearby places|近くの場所をもっと見る|查看更多附近地点
주변 장소 펼치기|Show nearby places|周辺の場所を表示|展开附近地点
접기|Collapse|閉じる|收起
주변 장소|Nearby places|周辺の場所|附近地点
지금 고리를 남길 수 있는 곳|Places to leave a Gori|今ゴリを残せる場所|可以留下Gori的地方
장소를 불러오지 못했어요. 잠시 후 다시 열어 주세요.|Couldn't load places. Please try again.|場所を読み込めませんでした。もう一度お試しください。|无法加载地点，请稍后重试。
닫기|Close|閉じる|关闭
주소|Address|住所|地址
이곳의 고리 ·|Gori here ·|この場所のゴリ・|此处的Gori·
· 남겨진 기억|· Memories:|・思い出数：|·回忆数：
개||件|个
봉인된 고리|Sealed Gori|封印されたゴリ|封存的Gori
열린 고리|Opened Gori|開いたゴリ|已开启的Gori
여기에 고리 걸기|Leave a Gori here|ここにゴリを掛ける|在这里留下Gori
이메일과 비밀번호를 입력해 주세요|Enter your email and password.|メールアドレスとパスワードを入力してください。|请输入邮箱和密码。
이메일 형식이 올바르지 않아요|Enter a valid email address.|メールアドレスの形式を確認してください。|请输入有效的邮箱地址。
비밀번호는 8자 이상이어야 해요|Use at least 8 characters for your password.|パスワードは8文字以上にしてください。|密码至少需要8个字符。
잠시 후 다시 시도해 주세요|Please try again shortly.|しばらくしてからお試しください。|请稍后重试。
회원가입이 완료됐어요|Your account is ready|登録が完了しました|注册成功
이제 장소에 기억을 맡기고, 다시 와서 꺼내 보세요.|Leave a memory here and return to open it.|場所に思い出を預けて、また開きに来てください。|在这里留下回忆，再回来开启吧。
시작하기|Get started|はじめる|开始
닫고 홈으로|Close and go home|閉じてホームへ|关闭并返回首页
로그인|Log in|ログイン|登录
회원가입|Sign up|新規登録|注册
닉네임 (선택)|Nickname (optional)|ニックネーム（任意）|昵称（选填）
이메일|Email|メールアドレス|邮箱
비밀번호|Password|パスワード|密码
확인 중…|Checking…|確認中…|确认中…
가입하기|Create account|登録する|创建账户
계정이 없나요? 회원가입|New here? Sign up|アカウント作成はこちら|没有账户？注册
이미 계정이 있어요|I already have an account|アカウントをお持ちの方|已有账户
비밀번호 찾기|Forgot password?|パスワードを忘れた方|忘记密码
비밀번호 재설정 메일 기능은 준비 중이에요.|Password reset emails are not available yet.|パスワード再設定メールは準備中です。|密码重置邮件功能尚未开放。
여행자|Traveler|旅人|旅行者
쌓인 고리,|Your Gori,|重ねたゴリ、|积攒的Gori，
나만의 여행 기록|your travel story|自分だけの旅の記録|专属的旅行记录
설정|Settings|設定|设置
내 추억|My memories|私の思い出|我的回忆
장소에 남긴 사진과 편지|Photos and letters you've left|場所に残した写真と手紙|留下的照片和信件
내 수집|My collection|私のコレクション|我的收藏
모은 장소 문양|Place badges you've collected|集めた場所のバッジ|收集的地点徽章
계정·알림·권한 관리|Account, notifications and permissions|アカウント・通知・権限|账户、通知与权限
로그인한 계정|Signed-in account|ログイン中のアカウント|当前登录账户
알림·권한은 휴대폰 설정에서 바꿀 수 있어요.|Manage notifications and permissions in your phone settings.|通知と権限は端末の設定で変更できます。|可在手机设置中更改通知和权限。
로그아웃|Log out|ログアウト|退出登录
다시 꺼내 보는|Open again,|また開く、|再次打开，
우리의 순간|our moments|私たちの瞬間|我们的瞬间
관광자원 분류 필터|Filter by place category|場所のカテゴリで絞り込み|按地点类别筛选
전체|All|すべて|全部
아직 걸어 둔 고리가 없어요|No Gori yet|まだゴリがありません|还没有留下Gori
장소 고르러 가기|Choose a place|場所を選ぶ|选择地点
이 분류에 남긴 고리가 없어요|No Gori in this category|このカテゴリにはゴリがありません|此类别暂无Gori
다른 분류를 선택하거나 전체 추억을 확인해 보세요.|Try another category or view all memories.|他のカテゴリか、すべての思い出を確認してください。|请选择其他类别，或查看全部回忆。
전체 보기|View all|すべて見る|查看全部
기억|Memory|思い出|回忆
· 🔒 잠김|· 🔒 Locked|・🔒 ロック中|·🔒 已锁定
더보기|More options|その他|更多选项
고리 삭제|Delete Gori|ゴリを削除|删除Gori
아직 열 수 없어요|You can't open this yet.|まだ開けません。|暂时无法开启。
열지 못했어요|Couldn't open the Gori.|ゴリを開けませんでした。|无法开启Gori。
기억을 찾을 수 없어요.|Memory not found.|思い出が見つかりません。|找不到这段回忆。
추억으로|Go to memories|思い出へ|前往回忆
물결|Waves|波|波纹
그날의 사진|Photo from that day|あの日の写真|那天的照片
사진:|Photo:|写真：|照片：
· 원본|· Original|・原本|·原图
그 자리에 다시 오면 열려요|Return to this spot to open it.|この場所に戻ると開けられます|回到这里即可开启
그 자리에서 지금 모습을 찍으면, 같은 자리인지 확인하고 열어 드려요.|Take a photo here. We'll check the location before opening it.|今の風景を撮ると、同じ場所か確認して開きます。|拍下此刻的风景，确认是同一地点后即可开启。
다시 왔어요 · 열기|I'm back · Open|また来ました・開く|我回来了·开启
고리를 풀지 못했어요|Couldn't remove the Gori.|ゴリを外せませんでした。|无法取下Gori。
고리를 풀지 못했어요. 잠시 후 다시 시도해 주세요|Couldn't remove the Gori. Please try again.|ゴリを外せませんでした。もう一度お試しください。|无法取下Gori，请稍后重试。
고리를 찾을 수 없어요.|Gori not found.|ゴリが見つかりません。|找不到Gori。
고리 삭제 완료|Gori deleted|ゴリを削除しました|Gori已删除
고리를 풀었어요|Gori removed|ゴリを外しました|已取下Gori
이 고리에 담긴 편지와 사진이 삭제됐어요.|The letter and photo in this Gori have been deleted.|このゴリの手紙と写真を削除しました。|此Gori中的信件和照片已删除。
추억으로 돌아가기|Back to memories|思い出に戻る|返回回忆
장소 확인|Check location|場所の確認|确认地点
고리를 남긴 장소를 비춰주세요|Point the camera at the place you left your Gori.|ゴリを残した場所を映してください|请将镜头对准留下Gori的地方
주변 풍경과 위치 정보로 장소를 확인해요.|We check the surroundings and your location.|周辺の風景と位置情報で場所を確認します。|通过周围风景和位置信息确认地点。
이 장소 확인하기|Confirm this place|この場所を確認|确认此地点
자물쇠 풀기|Remove Gori|ゴリを外す|取下Gori
함께 왔는지 확인하고 있어요|Checking your companion|同行者を確認中です|正在确认同行者
잠금 조건을 확인했어요|Checking unlock conditions|解除条件を確認しました|已检查解锁条件
위치 확인 완료|Location confirmed|位置確認完了|位置已确认
위치 확인 필요|Location check required|位置の確認が必要です|需要确认位置
위치 확인 중|Checking location|位置を確認中|正在确认位置
고리를 남긴 장소에 도착했어요.|You're at the place you left your Gori.|ゴリを残した場所に到着しました。|已到达留下Gori的地点。
고리를 남긴 장소에서 다시 확인해주세요.|Check again at the place you left your Gori.|ゴリを残した場所でもう一度確認してください。|请在留下Gori的地点重新确认。
지금 위치를 확인하고 있어요.|Checking your current location.|現在地を確認しています。|正在确认当前位置。
동행자 확인 완료|Companion check complete|同行者の確認完了|同行者确认完成
동행자 확인 중|Checking companion|同行者を確認中|正在确认同行者
Bluetooth로 함께 온 사람을 확인했어요.|Your companion was confirmed via Bluetooth.|Bluetoothで同行者を確認しました。|已通过蓝牙确认同行者。
Bluetooth로 함께 등록한 기기를 찾고 있어요.|Looking for the paired device via Bluetooth.|Bluetoothで登録済みの端末を探しています。|正在通过蓝牙查找已配对的设备。
고리를 풀면 편지와 사진이 삭제돼요.|Removing the Gori deletes its letter and photo.|ゴリを外すと手紙と写真が削除されます。|取下Gori将删除其中的信件和照片。
푸는 중…|Removing…|取り外し中…|正在取下…
위치를 확인할 수 없어요|Couldn't confirm your location|位置を確認できません|无法确认位置
고리를 남긴 장소에 도착했는지 확인하고, 위치 권한을 허용한 뒤 다시 시도해주세요.|Return to the place, allow location access, and try again.|現地で位置情報を許可して、もう一度お試しください。|请到达原地点并允许位置权限后重试。
위치 다시 확인|Check location again|位置を再確認|重新确认位置
여행이 모이면, 나의 배지|Collect places, collect badges|旅を重ねて、私のバッジ|收集旅行，点亮徽章
장소에 고리를 남기고 배지를 모아보세요.|Leave a Gori and collect place badges.|場所にゴリを残してバッジを集めましょう。|留下Gori，收集地点徽章。
획득|Collected|獲得済み|已获得
미획득|Not collected|未獲得|未获得
배지를 찾을 수 없어요.|Badge not found.|バッジが見つかりません。|找不到徽章。
수집함으로|Go to collection|コレクションへ|前往收藏
획득일|Collected on|獲得日|获得日期
아직 획득 전이에요|Not collected yet|まだ獲得していません|尚未获得
획득 장소|Place|獲得場所|获得地点
획득 조건|Requirement|獲得条件|获得条件
이 장소에 첫 고리 남기기|Leave your first Gori here|ここに初めてゴリを残す|在此首次留下Gori
배지 상세|Badge details|バッジの詳細|徽章详情
획득 완료|Collected|獲得済み|已获得
확인 중|Checking|確認中|确认中
방문 기록을 바탕으로 획득한 배지입니다.|Earned from your visit record.|訪問記録に基づくバッジです。|根据到访记录获得的徽章。
수집함으로 돌아가기|Back to collection|コレクションに戻る|返回收藏
이 장소에서 열기|Open at this place|この場所で開く|在此地点开启
같이 열기|Open together|一緒に開く|共同开启
정한 날에 열기|Open on a date|指定した日に開く|在指定日期开启
그 계절이 오면 열기|Open next season|その季節に開く|待季节到来时开启
위치와 사진을 확인하고 있어요…|Checking location and photo…|位置と写真を確認中…|正在确认位置和照片…
카메라를 쓸 수 없어요. 사진을 골라 주세요|Camera unavailable. Please choose a photo.|カメラを使えません。写真を選んでください。|无法使用相机，请选择照片。
이 장소의 고정 지점이 아직 없어요|This place has no location set yet.|この場所の位置はまだ設定されていません。|此地点尚未设置位置。
위치 권한을 허용해야 고리를 걸 수 있어요|Allow location access to leave a Gori.|ゴリを掛けるには位置情報を許可してください。|请允许位置权限以留下Gori。
인증하지 못했어요|Verification failed.|確認できませんでした。|验证失败。
편지를 한 줄 이상 적어 주세요|Please write at least one line.|手紙を1行以上書いてください。|请至少写下一句话。
편지를 읽고 기억 카드를 만들고 있어요…|Reading your letter and creating a memory card…|手紙を読んで思い出カードを作成中…|正在阅读信件并生成回忆卡片…
카드를 만들지 못했어요|Couldn't create the card.|カードを作成できませんでした。|无法生成卡片。
저장하지 못했어요|Couldn't save. Please try again.|保存できませんでした。|保存失败，请重试。
이 장소에 고리를 걸어요|Leave a Gori at this place|この場所にゴリを掛けましょう|在这里留下Gori
카메라로 지금 머무는 장소를 비춰주세요.|Point your camera at your surroundings.|今いる場所をカメラで映してください。|请将镜头对准周围的风景。
현재 장소 ·|Current place ·|現在の場所・|当前地点·
(시연)|(Demo)|（デモ）|（演示）
확인한 장소에 사진과 편지를 보관해요.|Keep your photo and letter at this place.|確認した場所に写真と手紙を保管します。|将照片和信件保存在此地点。
자물쇠 걸기|Hang a Gori|ゴリを掛ける|挂上Gori
공간을 비추고 놓을 위치로 이동해주세요|Point the camera where you'd like to place it.|置きたい場所をカメラで映してください|请将镜头对准想要放置的位置
고리를 들고 가는 중…|Bringing your Gori…|ゴリを運んでいます…|正在带来Gori…
찰칵! 이 자리에 고리를 걸었어요|Your Gori is here!|ここにゴリを掛けました！|Gori已挂在这里！
여기에 자물쇠 걸기|Hang a Gori here|ここにゴリを掛ける|在这里挂上Gori
모델 미리보기|Model preview|モデルプレビュー|模型预览
사진과 편지|Photo and letter|写真と手紙|照片与信件
열람 조건|Unlock conditions|開く条件|开启条件
이 고리를 걸어요|Your Gori|このゴリを掛けます|选择这个Gori
선택하기|Select|選択する|选择
이곳에 남기는 편지|A letter for this place|この場所に残す手紙|留给此地的信
편지 제목 (비우면 AI가 지어요)|Letter title (optional; AI can suggest one)|手紙の題名（空欄ならAIが提案）|信件标题（留空则由AI生成）
어떤 언어로든 괜찮아요. 오늘 이 자리에서 남기고 싶은 말을 적어 주세요.|Write in any language. What would you like to leave here today?|どの言語でも大丈夫です。今日ここに残したい言葉を書いてください。|可以使用任何语言，写下今天想留在此地的话。
소중한 순간을 고리에 담아요|Keep your special moments in a Gori|大切な瞬間をゴリに込めて|把珍贵的瞬间装进Gori
함께 남길 사진|A photo to keep|一緒に残す写真|一同留下的照片
사진 추가|Add photo|写真を追加|添加照片
기억 카드를 만드는 중…|Creating memory card…|思い出カードを作成中…|正在生成回忆卡片…
저장하기|Save|保存する|保存
내용 공개 범위|Who can see this?|公開範囲|内容可见范围
나만 보기|Only me|自分だけ|仅自己可见
나에게만 편지와 사진이 보여요.|Only you can see the letter and photo.|手紙と写真は自分だけに見えます。|只有你能看到信件和照片。
이 장소의 기억 벽에 남기기|Share on the memory wall|この場所の思い出の壁に残す|分享至此地的回忆墙
이름·연락처를 지운 한 줄만 다른 방문자에게 보여요.|Others see only an anonymous line, without names or contact details.|名前や連絡先を除いた一文だけを他の訪問者に公開します。|其他访客仅能看到去除姓名与联系方式的一句话。
열 수 있는 조건|When can it be opened?|開けられる条件|何时可以开启？
다시 열기|Open again|また開く|再次开启
자물쇠 외형과 편지·사진의 공개 범위는 구분돼요.|The Gori's appearance and the privacy of its contents are separate.|ゴリの見た目と手紙・写真の公開範囲は別です。|Gori的外观与信件、照片的可见范围分别设置。
고리를 걸었어요|Your Gori is saved|ゴリを掛けました|Gori已留下
추억 보기|View memories|思い出を見る|查看回忆
홈으로|Go home|ホームへ|返回首页
{place}에서 {distance}m 떨어져 있어요. {radius}m 안으로 와 주세요|You are {distance}m from {place}. Come within {radius}m.|{place}から{distance}m離れています。{radius}m以内に来てください。|距离{place}还有{distance}米，请进入{radius}米范围内。
안녕하세요, {name}님|Hello, {name}|こんにちは、{name}さん|你好，{name}
{count}개|{count}|{count}件|{count}个
{date}에 남긴 기억|Memory from {date}|{date}に残した思い出|于{date}留下的回忆
{place}에 고리를 남기면 받을 수 있어요.|Leave a Gori at {place} to earn this badge.|{place}にゴリを残すと獲得できます。|在{place}留下Gori即可获得。
자연·경관|Nature & scenery|自然・景観|自然风光
역사·문화유산|History & heritage|歴史・文化遺産|历史文化遗产
도시 명소|City landmarks|都市の名所|城市地标
문화·예술공간|Culture & arts|文化・芸術|文化艺术空间
명지대학교|Myongji University|明知大学|明知大学
명지대학교 인문캠퍼스|Myongji University, Seoul Campus|明知大学 人文キャンパス|明知大学人文校区
경복궁|Gyeongbokgung Palace|景福宮|景福宫
독립문|Dongnimmun Gate|独立門|独立门
서울 독립문|Dongnimmun Gate, Seoul|ソウル独立門|首尔独立门
홍제폭포|Hongje Falls|弘済滝|弘济瀑布
남산의 능선|Namsan Ridge|南山の稜線|南山山脊
남산 · N서울타워|Namsan · N Seoul Tower|南山・Nソウルタワー|南山·N首尔塔
홍제의 물결|Hongje Waves|弘済の波|弘济水波
인왕의 바위|Inwang Rocks|仁王の岩|仁王岩石
인왕산|Inwangsan Mountain|仁王山|仁王山
궁궐의 단청|Palace Colors|宮殿の丹青|宫阙丹青
한옥의 처마|Hanok Eaves|韓屋の軒|韩屋屋檐
은평역사한옥박물관|Eunpyeong History & Hanok Museum|恩平歴史韓屋博物館|恩平历史韩屋博物馆
연꽃의 결|Lotus Petals|蓮の花びら|莲花纹理
진관사|Jingwansa Temple|津寛寺|津宽寺
서울의 빛|Seoul Lights|ソウルの光|首尔之光
서대문형무소역사관|Seodaemun Prison History Hall|西大門刑務所歴史館|西大门刑务所历史馆
한강의 연결|Across the Hangang|漢江のつながり|汉江之桥
서울함공원 · 한강|Seoul Battleship Park · Hangang|ソウル艦公園・漢江|首尔舰公园·汉江
성곽의 길|Stonewall Path|城郭の道|城郭之路
무대의 울림|Stage Echoes|舞台の響き|舞台回响
명동예술극장|Myeongdong Theater|明洞芸術劇場|明洞艺术剧场
책 속의 산책|A Walk Through Books|本の中の散歩|书中漫步
공예의 손길|Hands of Craft|工芸の手仕事|工艺之手
서울공예박물관|Seoul Museum of Craft Art|ソウル工芸博物館|首尔工艺博物馆
경의선 왕복표|Gyeongui Return Ticket|京義線の往復切符|京义线往返票
구 신촌역사|Old Sinchon Station|旧新村駅舎|旧新村站舍
공룡 발굴함|Dinosaur Discovery Box|恐竜発掘箱|恐龙发掘盒
서대문자연사박물관|Seodaemun Museum of Natural History|西大門自然史博物館|西大门自然史博物馆
비축 밸브|Storage Valve|備蓄バルブ|储备阀门
문화비축기지 T4|Oil Tank Culture Park T4|文化備蓄基地T4|文化储备基地T4
잠망경|Periscope|潜望鏡|潜望镜
서울함공원|Seoul Battleship Park|ソウル艦公園|首尔舰公园
조각보 매듭|Patchwork Knot|ポジャギの結び目|拼布结
카세트|Cassette|カセット|磁带
서울우리소리박물관|Seoul Museum of Korean Folk Music|ソウルウリソリ博物館|首尔民谣博物馆
기억 금고|Memory Vault|思い出の金庫|回忆保险箱
한국은행 화폐박물관|Bank of Korea Money Museum|韓国銀行貨幣博物館|韩国银行货币博物馆
필름 통|Film Canister|フィルム缶|胶片盒
맞물림 기와|Interlocking Roof Tiles|組み合う瓦|拼合屋瓦
한지 보존 봉투|Hanji Envelope|韓紙の保存封筒|韩纸信封
진관사 칠성각|Jingwansa Chilseonggak Hall|津寛寺七星閣|津宽寺七星阁
사랑의 자물쇠|Love Lock|愛の南京錠|爱情锁
어디서나 (기본 고리)|Anywhere (default Gori)|どこでも（基本のゴリ）|任何地方（默认Gori）
원고첩|Manuscript Book|原稿帳|手稿册
핀슨관 모티프|Pinson Hall motif|ピンソン館モチーフ|Pinson馆造型
봉화|Beacon|烽火|烽火
안산 봉수대|Ansan Beacon Mound|鞍山烽燧台|鞍山烽燧台
유리병 편지|Message in a Bottle|瓶の中の手紙|漂流瓶信件
추모 편지|Memorial Letter|追悼の手紙|纪念信件
백마 자물쇠|White Horse Lock|白馬の南京錠|白马锁
돌 아치 고리|Stone Arch Gori|石のアーチのゴリ|石拱Gori
왕실 보록 자물쇠|Royal Seal Lock|王室の宝盝錠|王室宝盝锁
겹겹이 이어진 능선과 둥근 달을 담았어요. 오늘 남긴 고리를 기억하는 배지예요.|Layered ridges and a round moon mark the Gori you left today.|重なる稜線と丸い月に、今日のゴリを記したバッジです。|层叠山脊与圆月，纪念今天留下的Gori。
바위를 타고 떨어지는 홍제폭포의 물결을 담은 배지예요.|A badge inspired by Hongje Falls flowing over the rocks.|岩を流れる弘済滝の波を表したバッジです。|以弘济瀑布倾泻于岩石间的水波为灵感的徽章。
도심 가까이 우뚝 선 인왕산의 너른 바위를 담은 배지예요.|Inspired by Inwangsan's broad rocks above the city.|街の近くにそびえる仁王山の岩を表したバッジです。|描绘城市近旁仁王山宽阔岩石的徽章。
궁궐 처마 아래 고운 단청 무늬를 담은 배지예요.|Inspired by the colorful patterns beneath palace eaves.|宮殿の軒下を彩る丹青模様のバッジです。|以宫殿屋檐下精美丹青为灵感的徽章。
부드럽게 들린 한옥 처마의 선을 담은 배지예요.|Inspired by the gentle curves of hanok eaves.|優しく反り上がる韓屋の軒を表したバッジです。|以韩屋柔美上扬的屋檐线条为灵感的徽章。
절 마당에 피어난 연꽃의 결을 담은 배지예요.|Inspired by lotus flowers in a temple courtyard.|寺の庭に咲く蓮の花を表したバッジです。|以寺院庭中盛开的莲花为灵感的徽章。
밤에도 꺼지지 않는 서울의 빛을 담은 배지예요.|A badge of Seoul's lights that shine through the night.|夜も輝き続けるソウルの光のバッジです。|描绘首尔不熄夜光的徽章。
강 이쪽과 저쪽을 잇는 한강 다리를 담은 배지예요.|A badge of the bridges linking the banks of the Hangang.|漢江の両岸を結ぶ橋を表したバッジです。|描绘连接汉江两岸桥梁的徽章。
돌을 하나하나 쌓아 올린 옛길의 시간을 담은 배지예요.|A badge of old paths built stone by stone.|石を積み重ねた古道の時を表したバッジです。|记录古道一石一石堆砌的时光。
막이 오르던 순간의 울림을 담은 배지예요.|Remember the moment the curtain rose.|幕が上がる瞬間の響きを表したバッジです。|纪念舞台拉开帷幕瞬间的徽章。
책장 사이를 걷던 캠퍼스의 하루를 담은 배지예요.|Remember a campus day spent wandering among books.|本棚の間を歩いたキャンパスの一日のバッジです。|纪念穿行书架间的校园时光。
손으로 빚고 엮은 공예의 결을 담은 배지예요.|Celebrate the textures of handmade crafts.|手で作り編み上げる工芸のバッジです。|以手作与编织工艺纹理为灵感的徽章。
명지대를 상징하는 흰 백마를 파란 자물쇠에 새겼어요. 캠퍼스에서 오래 기억하고 싶은 하루를 사진과 한 줄로 남겨보세요.|Myongji's white horse on a blue lock. Keep a campus day in a photo and a few words.|明知大学の白馬を青い錠に刻みました。キャンパスの一日を写真と言葉で残しましょう。|蓝色锁上刻着象征明知大学的白马，用照片和文字留下校园中的一天。
독립문의 열린 돌 아치와 안쪽의 붉은 벽돌을 본뜬 고리예요. 아치 너머로 보이던 풍경과 그 자리에서 든 생각을 담아보세요.|Inspired by Dongnimmun's stone arch and red bricks. Keep the view beyond the arch and your thoughts.|独立門の石のアーチと赤レンガを模したゴリです。向こうに見えた風景と思いを残しましょう。|以独立门石拱与红砖为造型，留下拱门外的风景和此刻的感想。
1726년 선의왕후의 옥도장을 보관하던 함의 자물쇠를 본떴어요. 꽃과 덩굴 무늬가 새겨진 자물쇠에 경복궁에서 보낸 하루를 잠가 두세요.|Inspired by the lock on Queen Seonui's jade-seal chest from 1726. Keep your day at Gyeongbokgung in its floral patterns.|1726年、宣懿王后の玉印を納めた箱の錠を模しました。花とつる模様に景福宮の一日を託しましょう。|仿照1726年存放宣懿王后玉印的箱锁，以花藤纹样封存景福宫的一天。
홍제폭포 앞에서 보낸 시간을 코르크 마개가 달린 유리병에 담아요. 다시 그 자리에 오면 병을 열어 그날의 편지와 사진을 꺼내 볼 수 있어요.|Keep your time at Hongje Falls in a corked bottle. Return here to open your letter and photo.|弘済滝での時間をコルク付きの瓶に。再び訪れると、あの日の手紙と写真を開けます。|将弘济瀑布前的时光装进软木塞玻璃瓶，再次到访即可开启那天的信件和照片。
언어|Language|言語|语言
선택한 언어로 화면과 새 AI 결과를 표시해요. 저장한 편지는 원문으로 유지돼요.|This language applies to the interface and new AI results. Saved letters keep their original language.|画面と新しいAI結果に反映します。保存済みの手紙は原文のままです。|用于界面和新生成的AI结果，已保存的信件保留原文。
사진을 읽지 못했어요|Couldn't read the photo.|写真を読み込めませんでした。|无法读取照片。
지도를 불러오지 못했어요|Couldn't load the map.|地図を読み込めませんでした。|无法加载地图。
지도 키(NEXT_PUBLIC_NAVER_MAP_CLIENT_ID)가 없어요|Map unavailable.|地図を利用できません。|地图暂不可用。
지도 인증에 실패했어요. 네이버 콘솔의 웹 서비스 URL을 확인해 주세요|Map unavailable. Please try again later.|地図を表示できません。後でもう一度お試しください。|地图暂不可用，请稍后重试。
처음 맡긴 그 자리에서 다시 찍어 주세요|Take another photo at the original spot.|最初に残した場所でもう一度撮影してください。|请在最初留下回忆的地点重新拍摄。
그날이 아직 오지 않았어요|The opening date hasn't arrived yet.|まだ開ける日になっていません。|尚未到开启日期。
다음 시즌에 다시 와보세요.|Come back next season.|次の季節にまた来てください。|下个季节再来看看吧。
그 사람과 함께 오기를.|Come back together.|その人と一緒に戻ってきてください。|期待与你们一同回来。
이 장소에 다시 오면 열려요.|Return to this place to open it.|この場所に戻ると開けられます。|回到这里即可开启。
같은 장소로 확인했어요.|This appears to be the same place.|同じ場所と確認しました。|已确认为同一地点。
이메일 또는 비밀번호가 올바르지 않아요|Incorrect email or password.|メールアドレスかパスワードが正しくありません。|邮箱或密码不正确。
네트워크에 연결하지 못했어요|Couldn't connect to the network.|ネットワークに接続できませんでした。|无法连接网络。
요청에 실패했어요|The request failed.|リクエストに失敗しました。|请求失败。
알 수 없는 오류|Something went wrong.|エラーが発生しました。|发生未知错误。
요청 시간이 초과됐어요|The request timed out.|リクエストがタイムアウトしました。|请求超时。
다시 이곳에 와서 고리를 열어보세요.|Return here to open your Gori.|ここに戻ってゴリを開いてみてください。|再次来到这里开启Gori吧。
`;

export const TRANSLATIONS: Record<string, readonly string[]> = Object.fromEntries(
  rows.trim().split("\n").map((row) => { const [key, ...values] = row.split("|"); return [key, values]; }),
);
const sourceKeys = new Map<string, string>();
for (const [key, translations] of Object.entries(TRANSLATIONS)) {
  for (const value of translations) if (value && !sourceKeys.has(value)) sourceKeys.set(value, key);
}

export function translate(language: Language, source: string, values?: Record<string, string | number>): string {
  const normalized = source.replace(/\s+/g, " ").trim();
  const key = TRANSLATIONS[normalized] ? normalized : sourceKeys.get(normalized) ?? normalized;
  const index = { en: 0, ja: 1, zh: 2 };
  const translated = language === "ko" ? (TRANSLATIONS[normalized] ? source : key) : TRANSLATIONS[key]?.[index[language]] ?? source;
  return values ? translated.replace(/\{(\w+)\}/g, (match, name: string) => String(values[name] ?? match)) : translated;
}
