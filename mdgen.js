import _ from 'lodash';
import Path from 'path';
import Url from 'url';
import FsExtra from 'fs-extra';
import Axios from 'axios';
import Yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

/**
 * =============================================================
 * 术语概念
 * 1. Markdown 生成配置：即在 JSON -> Markdown 中间进行的数据转换结构，每个游戏按理应该有一个对应的生成配置
 *
 * 主流程部分
 * 1. 获取API JSON数据
 * 2. JSON数据生成用于Markdown文本生成的配置
 * 3. 从上一步产生的配置构造Markdown文本
 * 4. 写入文件
 *
 * 说明
 * 1. 以下说明中，<序号> 指代的是上述主流程中对应序号的条目，<序号-字母> 指代的是上述对应序号的辅助函数
 * 2. 下面所有下划线（非 lodash) 开头的函数都是辅助函数
 * 3. 下面若标注了 [SE]，表示这个方法调用在设计上就是需要副作用 (Side Effect) 的
 * =============================================================
 */
const argv = Yargs(hideBin(process.argv))
    .option('server', {
        type: 'string',
        description: 'Server tag',
    })
    .option('debug', {
        type: 'boolean',
        description: 'Debug mode',
    })
    .parse();

function _getApiUrl() {
    const urlMap = {
        cn: 'https://hyp-api.mihoyo.com/hyp/hyp-connect/api/getGamePackages?launcher_id=jGHBHlcOq1',
        global: 'https://sg-hyp-api.hoyoverse.com/hyp/hyp-connect/api/getGamePackages?launcher_id=VYTpXlbWo8',
    };
    const server = argv.server || '';
    return urlMap[server] || '';
}

/**
 * <1> 获取API
 */
async function getApiJson() {
    if (!argv.debug) {
        const url = _getApiUrl();
        if (!url) {
            return {};
        }
        const resData = await Axios
            .get(url)
            .then(res => res.data);
        return resData;
    } else {
        // 本地调试
        const resData = FsExtra.readJsonSync('./data.json', { encoding: 'utf-8' });
        return resData;
    }
}

/**
 * <2> 生成Markdown生成配置
 */
function getMarkdownGenerateConfig(obj) {
    // 此处 mg 前缀为 markdownGenerate
    const mgConfigs = [];

    // 请注意此函数内，所有带 (*) 的步骤
    for (let gameObj of (obj?.data?.game_packages ?? [])) {
        // 此处简要说明一下 || 和 ?? 在这里的区别，|| 是“前者为假值则使用后面的值”，?? 是“前者为 null 或者 undefined 则使用后面的值”
        const gameBiz = gameObj?.game?.biz || '';
        // 参见：<2-C>
        const gameConfig = _getGameConfig(gameBiz);
        if (!gameConfig) {
            // 游戏配置如果不存在，则没必要处理对应的Markdown生成配置，可以直接处理下一个游戏
            // 后续 continue 逻辑自行理解
            continue
        }

        // 下面的 pr 前缀，表示 pre_release
        const prMajor = gameObj?.pre_download?.major
        const prPatches = gameObj?.pre_download?.patches ?? [];
        if (!prMajor) {
            continue;
        }

        // (*) 1. 创建当前游戏Markdown生成配置的数据框架
        const gameMarkdownConfig = _createMarkdownConfigFrame();
        // (*) 2. 从数据里，提取主数据
        _updateMarkdownConfigMain(gameMarkdownConfig, gameConfig, prMajor, prPatches);
        // (*) 3. 从数据里，提取更新数据
        _updateMarkdownConfigUpdates(gameMarkdownConfig, gameConfig, prMajor, prPatches);
        // (*) 4. 从数据里，提取安装包数据
        _updateMarkdownConfigInstall(gameMarkdownConfig, gameConfig, prMajor, prPatches);

        mgConfigs.push(gameMarkdownConfig);
    }

    return mgConfigs;
}

/**
 * <2-C> 根据游戏biz值，获取游戏Markdown生成配置
 */
function _getGameConfig(biz) {
    // 游戏biz - 游戏Markdown生成配置关系映射
    const configMap = {
        nap_cn: {
            // mdPathGen 为动态生成Markdown目标路径的，传入的参数为当前的Markdown生成配置
            serverTag: 'cn',
            mdPathGen: (m) => `cn/ZenlessZoneZero/Version_${m.version}.md`,
            // versionTagGen 为动态生成版本标签的，传入的参数为当前的Markdown生成配置
            versionTagGen: (m) => `CNRELWin${m.version}`,
        },
        // 崩坏：星穹铁道
        hkrpg_cn: {
            serverTag: 'cn',
            mdPathGen: (m) => `cn/HonkaiStarRail/Version_${m.version}.md`,
            versionTagGen: (m) => `CNRELWin${m.version}`,
        },
        // 崩三
        bh3_cn: {
            serverTag: 'cn',
            mdPathGen: (m) => `cn/Honkai3rd/Version_${m.version}.md`,
            versionTagGen: (m) => `CNRELWin${m.version}`,
        },
        nap_global: {
            serverTag: 'global',
            mdPathGen: (m) => `global/Honkai3rd/Version_${m.version}.md`,
            versionTagGen: (m) => `OSRELWin${m.version}`,
        }
    };
    const validServer = argv.server || '';
    const config = configMap[biz];
    if (config?.serverTag !== validServer) {
        return null;
    }
    return config;
}

/**
 * <2-L> 通过国家代码，获取Markdown里的对应名字
 */
function _getLanguageName(lang) {
    const langMap = {
        'en-us': 'EN',
        'ja-jp': 'JP',
        'ko-kr': 'KO',
        'zh-cn': 'CN',
    };
    return langMap[lang];
}

/**
 * <2-F> 生成空的Markdown生成配置数据框架
 */
function _createMarkdownConfigFrame() {
    return {
        mdPath: '',
        version: '',
        versionTag: '',
        releaseType: '',
        updateUrls: [],
        installUrl: null,
    }
}

/**
 * <2-M> 传入Markdown生成配置，通过提取API JSON条目的数据，更新其中主信息相关字段
 * [SE] 直接在原生成配置上修改，所以不返回值
 */
function _updateMarkdownConfigMain(markdownConfig, gameConfig, preReleaseMajor, preReleasePatches) {
    markdownConfig.version = preReleaseMajor?.version || '';
    // 通过游戏对应的配置，动态构造Markdown的文件保存路径，并赋值给mdPath，后续方便直接带入Markdown文件写入流程
    markdownConfig.mdPath = gameConfig.mdPathGen(markdownConfig);
    // 通过游戏对应的配置，动态构造版本标签，并赋值给versionTag，后续方便直接带入Markdown生成流程
    markdownConfig.versionTag = gameConfig.versionTagGen(markdownConfig);
}

/**
 * <2-P> 生成空的Markdown生成配置块数据框架
 * 此结构会作为所有版本的配置模型 (包括 Pre-Install 和 Install)
 */
function _createMarkdownConfigChunkFrame() {
    return {
        patchVersion: '', // 源版本版本号，如果来源是 major 则是主版本号，但可能用不到 major 版本的部分
        gameUrls: [], // 游戏数据地址
        audioUrls: {}, // 音频地址
    };
}

/**
 * <2-GC> 从版本条目（不区分是 Major 还是 Patch），更新对应的游戏数据 Markdown 配置块
 * [SE] 直接在原配置块上修改，所以不返回值
 */
function _updateMarkdownConfigGameChunk(mdConfigChunk, preReleaseItem) {
    if (!preReleaseItem) {
        return null;
    }

    mdConfigChunk.gameUrls = (preReleaseItem?.game_pkgs ?? []).map((item) => item.url);
}

/**
 * <2-AC> 从版本条目（不区分是 Major 还是 Patch），更新对应的音频数据 Markdown 配置块
 * [SE] 直接在原配置块上修改，所以不返回值
 */
function _updateMarkdownConfigAudioChunk(mdConfigChunk, preReleaseItem) {
    if (!preReleaseItem) {
        return null;
    }

    for (let audioItem of preReleaseItem.audio_pkgs) {
        const langCode = audioItem?.language || '';
        const langName = _getLanguageName(langCode);
        if (!langName) {
            continue;
        }

        const audioUrl = audioItem.url || '';
        mdConfigChunk.audioUrls[langName] = audioUrl;
    }
}

/**
 * <2-U> 传入Markdown生成配置，通过提取API JSON条目的数据，更新其中游戏补丁信息相关字段
 * [SE] 直接在原生成配置上修改，所以不返回值
 */
function _updateMarkdownConfigUpdates(markdownConfig, gameConfig, preReleaseMajor, preReleasePatches) {
    for (let preReleasePatch of preReleasePatches) {
        // 此处变量名 chunk，是为了明确它只是当前 Markdown 配置的一个分块，只是对应当前一个版本的 Patch 条目的数据
        const markdownConfigChunk = _createMarkdownConfigChunkFrame();

        markdownConfigChunk.patchVersion = preReleasePatch.version || '';
        _updateMarkdownConfigGameChunk(markdownConfigChunk, preReleasePatch);
        _updateMarkdownConfigAudioChunk(markdownConfigChunk, preReleasePatch);

        // 把当前 Patch 的生成配置项，追加到当前游戏Markdown生成配置的 updateUrls 数组里面
        // 后续其他方法类似，不再赘述
        markdownConfig.updateUrls.push(markdownConfigChunk);
    }
}

/**
 * <2-I> 传入Markdown生成配置，通过提取API JSON条目的数据，更新其中游戏完整包信息相关字段
 * [SE] 直接在原生成配置上修改，所以不返回值
 */
function _updateMarkdownConfigInstall(markdownConfig, gameConfig, preReleaseMajor, preReleasePatches) {
    const markdownConfigChunk = _createMarkdownConfigChunkFrame();

    markdownConfigChunk.patchVersion = preReleaseMajor?.version || '';
    _updateMarkdownConfigGameChunk(markdownConfigChunk, preReleaseMajor);
    _updateMarkdownConfigAudioChunk(markdownConfigChunk, preReleaseMajor);

    // 把 Major 的生成配置项，设置到当前游戏Markdown生成配置的 installUrl
    markdownConfig.installUrl = markdownConfigChunk;
}

/**
 * <3-P> 根据数组内元素数量和当前下标，获取 Part 标签文本
 */
function _getPartTag(totalCount, currentIndex) {
    // currentIndex + 1是因为下标从0开始
    return totalCount > 1 ? ` - Part ${currentIndex + 1}` : '';
}

/**
 * <3-MPI> 根据Markdown生成配置，返回单版本 Pre-Install 文本
 */
function _getMarkdownTextPreInstallItem(mdConfig, mdUpdateConfig) {
    // Markdown 行，最后拼接成一个文本
    const lines = [
        `### Update from ${mdUpdateConfig.patchVersion}`,
        '',
    ];

    // Game Data 部分
    const urlCount = mdUpdateConfig.gameUrls.length; // 因为后面需要根据 url 总数生成 Part 后缀，提取总数变量
    for (let i = 0; i < urlCount; i++) {
        const url = mdUpdateConfig.gameUrls[i];
        const partTag = _getPartTag(urlCount, i);
        const mdText = `- [Game Data from ${mdUpdateConfig.patchVersion} to ${mdConfig.version}${partTag}](${url})`;

        lines.push(mdText);
        lines.push('');
    }

    // Audio 部分
    if (!_.isEmpty(mdUpdateConfig.audioUrls)) {
        lines.push('### Audio Packages');
        lines.push('');
    }
    for (let langName in mdUpdateConfig.audioUrls) {
        const url = mdUpdateConfig.audioUrls[langName]
        const mdText = `- [Audio ${langName} from ${mdUpdateConfig.patchVersion} to ${mdConfig.version}](${url})`;

        lines.push(mdText);
        lines.push('');
    }

    // 分割线
    lines.push('----');
    lines.push('');

    return lines.join('\n');
}

/**
 * <3-MP> 根据Markdown生成配置，返回 Pre-Install 文本
 */
function _getMarkdownTextPreInstall(mdConfig) {
    // Markdown 行，最后拼接成一个文本
    const lines = [
        '## Pre-Install Section',
        '', // 空行
    ];

    for (let mdUpdateConfig of mdConfig.updateUrls) {
        lines.push(_getMarkdownTextPreInstallItem(mdConfig, mdUpdateConfig));
    }

    return lines.join('\n');
}

/**
 * <3-MI> 根据Markdown生成配置，返回 Install 文本
 */
function _getMarkdownTextInstall(mdConfig) {
    // Markdown 行，最后拼接成一个文本
    const lines = [
        '## Full-Install Section',
        '', // 空行
    ];

    // Game Data 分包部分
    const urlCount = mdConfig.installUrl.gameUrls.length; // 因为后面需要根据 url 总数生成 Part 后缀，提取总数变量
    for (let i = 0; i < urlCount; i++) {
        const url = mdConfig.installUrl.gameUrls[i];
        const partTag = _getPartTag(urlCount, i);
        const mdText = `- [${mdConfig.versionTag}${partTag}](${url})`;

        lines.push(mdText);
        lines.push('');
    }

    // Audio 部分
    if (!_.isEmpty(mdConfig.installUrl.audioUrls)) {
        lines.push('### Audio Packages');
        lines.push('');
    }
    for (let langName in mdConfig.installUrl.audioUrls) {
        const url = mdConfig.installUrl.audioUrls[langName]
        const mdText = `- [Audio ${langName} ${mdConfig.version}](${url})`;

        lines.push(mdText);
        lines.push('');
    }

    // 分割线
    lines.push('----');
    lines.push('');

    return lines.join('\n');
}

/**
 * <3-M> 根据Markdown生成配置，返回Markdown文本
 */
function _getMarkdownText(mdConfig) {
    return [
        `# Version ${mdConfig.version}`,
        '',
        _getMarkdownTextPreInstall(mdConfig),
        _getMarkdownTextInstall(mdConfig),
    ]
    .join('\n');
}

/**
 * <3> 根据Markdown生成配置，生成Markdown文本
 */
function generateMarkdown(markdownConfigs) {
    // 此处 om 前缀意义为 outputMarkdown，即输出 Markdown 文件
    const omConfigs = [];

    for (let markdownConfig of markdownConfigs) {
        const mdPath = markdownConfig.mdPath; // 输出路径
        const markdown = _getMarkdownText(markdownConfig);

        omConfigs.push({ markdown, mdPath });
    }

    return omConfigs;
}

/**
 * <4> 将Markdown文本写入对应文件
 */
function outputMarkdown(outputConfigs) {
    const dirPath = Path.dirname(Url.fileURLToPath(import.meta.url));
    for (let outputConfig of outputConfigs) {
        const mdPath = outputConfig.mdPath;
        const mdText = outputConfig.markdown;
        if (!mdPath || !mdText) {
            continue;
        }

        // Markdown 目标绝对路径
        const mdAbsPath = Path.resolve(dirPath, './patch_notes', `./${mdPath}`);
        FsExtra.outputFileSync(mdAbsPath, mdText, { encoding: 'utf-8' });
    }
}

(async function() {
    const apiData = await getApiJson();
    const markdownConfigs = getMarkdownGenerateConfig(apiData);
    const markdownTexts = generateMarkdown(markdownConfigs);
    outputMarkdown(markdownTexts);
})()

