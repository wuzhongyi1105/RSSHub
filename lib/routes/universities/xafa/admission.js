const got = require('@/utils/got');
const cheerio = require('cheerio');

module.exports = async (ctx) => {
    const url = `http://www.zhshch.xafa.edu.cn/bsyjszs1/zsjz.htm`;
    const response = await got({
        method: 'get',
        url,
    });
    const $ = cheerio.load(response.data);
    // ## 获取列表
    const list = $('.lm_list > ul > li > a').get();
    // ## 定义输出的item
    const out = await Promise.all(
        // ### 遍历列表，筛选出自己想要的内容
        list.map(async (item) => {
            const itemSingle = cheerio.load(item);
            const title = itemSingle.text();
            const re = /<a[^>]*href=['"]([^"]*)['"][^>]*>(.*?)<\/a>/g;
            let singleUrl = '';
            if (re.exec(itemSingle.html()) !== null) {
                singleUrl = RegExp.$1;
            }
            singleUrl = 'http://www.zhshch.xafa.edu.cn/' + singleUrl;
            const cache = await ctx.cache.get(singleUrl); // ### 得到全局中的缓存信息
            // ### 判断缓存是否存在，如果存在即跳过此次获取的信息
            if (cache) {
                return Promise.resolve(JSON.parse(cache));
            }
            // 获取详情页面的介绍
            const detail_response = await got({
                method: 'get',
                url: singleUrl,
            });
            const $ = cheerio.load(detail_response.data);
            const detail_content = $('form[name=_newscontent_fromname]').html();
            // ### 设置 RSS feed item
            const single = {
                title,
                link: singleUrl,
                // author: author,
                description: detail_content,
                pubDate: new Date(
                        $('.other-s')
                            .text()
                            .substring(0, $('.other-s').text().indexOf('    作者：'))
                            .replace('发布日期：', '')
                    ).toUTCString(),
            };
            // // ### 设置缓存
            ctx.cache.set(singleUrl, JSON.stringify(single));
            return Promise.resolve(single);
            // }
        })
    );

    ctx.state.data = {
        title: `招生简章 - 西安美术学院`,
        link: 'http://www.zhshch.xafa.edu.cn/bsyjszs1/zsjz.htm',
        description: `招生简章 - 西安美术学院`,
        item: out,
    };
};