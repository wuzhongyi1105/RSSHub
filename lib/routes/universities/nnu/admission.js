const got = require('@/utils/got');
const cheerio = require('cheerio');

module.exports = async (ctx) => {
    const url = `http://yz.njnu.edu.cn/homepage_right.jsp?wid=1`;
    const response = await got({
        method: 'get',
        url: url,
    });
    const $ = cheerio.load(response.data);
	// ## 获取时间
	const time = $('#wapper ul li');
	let updateDate = time.find('.mainDate').text();
    updateDate = new Date(updateDate).toUTCString();
    // ## 获取列表
    const list = $('#wapper > ul > li > div > a').get();
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
            singleUrl = 'http://yz.njnu.edu.cn/' + singleUrl;
			singleUrl = singleUrl.replace('amp;', '');
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
            const detail_content = $('.newC-middle > div').html();
            // ### 设置 RSS feed item
            const single = {
                title: title,
                link: singleUrl,
                // author: author,
                description: detail_content,
                pubDate: new Date(
                        $('h4')
                            .text()
                            .match(/\d{4}-\d{2}-\d{2}/)
                    ).toUTCString(),
            };
            // // ### 设置缓存
            ctx.cache.set(singleUrl, JSON.stringify(single));
            return Promise.resolve(single);
            // }
        })
    );

    ctx.state.data = {
        title: `博士招生 - 南京师范大学`,
        link: 'http://yz.njnu.edu.cn/homepage_right.jsp?wid=1',
        description: `博士招生 - 南京师范大学`,
        item: out,
    };
};