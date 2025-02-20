# HoYoUpdRepository

[中文版][p:zh-cn] | [English][p:en-us]

本仓库存放了米家游戏（包含国际服）的更新包体链接。省去低速的下载中解压（还是单线程下载），你可以使用任何的多线程下载软件（比如 IDM、FDM、XDM、uGet 等）来下载。

如果对链接的使用方法有疑问，请提 Issue，但谢绝未经思考的 Issue，包括但不限于：

```markdown
1. 如何解压？
2. 如何运行？
3. 如何下载？能不能提供下载软件？
4. 手机能用吗？（答：明显地，这是电脑上的压缩包）
```

在发起提问前，学会[如何提问][p:art-of-questioning]很重要。如果你提的 Issue 里包含以上内容、涉及违法违规的内容或令人类难以理解的内容，我有权 Close Issue 不作答复。

## 目前正在更新的游戏

- 《原神》
- 《崩坏：星穹铁道》
- 《绝区零》
- 《崩坏3》

## API 响应:

````json
{
  "data": {
    "game_packages": [
      {
        "game": {
          "id": "",
          "biz": ""
        },
        "main": {
          "major": {
            "version": "",
            "game_pkgs": [
              {
                "url": "",
                "md5": "",
                "size": "",
                "decompressed_size": ""
              },
            ],
            "audio_pkgs": [
              {
                "language": "",
                "url": "",
                "md5": "",
                "size": "",
                "decompressed_size": ""
              },
            ],
            "res_list_url": ""
          },
          "patches": [
            {
              "version": "",
              "game_pkgs": [
                {
                  "url": "",
                  "md5": "",
                  "size": "",
                  "decompressed_size": ""
                }
              ],
              "audio_pkgs": [
                {
                  "language": "",
                  "url": "",
                  "md5": "",
                  "size": "",
                  "decompressed_size": ""
                },
              ],
              "res_list_url": ""
            },
            {
              "version": "",
              "game_pkgs": [
                {
                  "url": "",
                  "md5": "",
                  "size": "",
                  "decompressed_size": ""
                }
              ],
              "audio_pkgs": [
                {
                  "language": "",
                  "url": "",
                  "md5": "",
                  "size": "",
                  "decompressed_size": ""
                },
              ],
              "res_list_url": ""
            }
          ]
        },
        "pre_download": {
          "major": "",
          "patches": []
        }
      }
    ]
  }
}
````

<hr>

Shield: [![CC BY-NC-SA 4.0][cc-by-nc-sa-shield]][cc-by-nc-sa]

This work is licensed under a
[Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License][cc-by-nc-sa].

[![CC BY-NC-SA 4.0][cc-by-nc-sa-image]][cc-by-nc-sa]

[cc-by-nc-sa]: http://creativecommons.org/licenses/by-nc-sa/4.0/
[cc-by-nc-sa-image]: https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png
[cc-by-nc-sa-shield]: https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg
[p:art-of-questioning]: https://github.com/ryanhanwu/How-To-Ask-Questions-The-Smart-Way?tab=readme-ov-file
[p:zh-cn]: ./README.md
[p:en-us]: ./README_en-us.md
