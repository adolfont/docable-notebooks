const path = require('path');
const cheerio = require('cheerio');
const docable = require('docable');

const utils = require('../utils');

const policy = require('./policy');

var uuid = require('uuid');

class NotebookRender
{
    async notebookRender(rootDir, md, ir) {

        let IR;
        let html;
        let self = this;
        try{
            IR = ir || await docable.transformers.inline.transform(Buffer.from(md, 'utf-8'));
    
            const $ = cheerio.load(IR);
            $('[data-docable="true"]').each(function (index, elem) {
    
                let cell = self.renderCell($(elem), $, policy.isExecutable($(elem)) );
    
            });
    
    
            // render svg blocks
            $('pre').each(function (index, elem) {
    
                if( $(elem).hasClass("language-svg") )
                {
                    let text = $(elem).text();
                    console.log(text);
                    $(elem).wrap(`<div class="svg-container"></div>`);
                    $(elem).parent().append(`<div class="svg-preview">${text}</div>`);
                }
            });
            // Rewrite relative imgs to be use media slug.
            let baseDir = "";
            if( rootDir != ".") baseDir = rootDir;
            $('img').each(function () {
                const link = $(this).attr('src');
                if (!link.startsWith('http') && !link.startsWith('//')) {
                    let fixedUrl = "/imgs/" + utils.notebook2slug(path.normalize( path.join(baseDir, link)));
                    $(this).attr('src', fixedUrl);
                }
            });
            // Rewrite relative links to markdown items to use notebook slug
            $('a').each(function () {
                const link = $(this).attr('href');
                if (link && link.match(/[.]md[#]?/) && !link.startsWith('http') && !link.startsWith('//')) {
                    let fixedUrl = "/notebooks/" + utils.notebook2slug(path.normalize( path.join(baseDir, link)));
                    $(this).attr('href', fixedUrl);
                }
            });
    
    
    
            html = $.html();
        } catch (err) {
            console.log('err', err)
        }
    
        return { html, IR, md }
    }
    
    async renderCell(elem, $, executable)
    {
        let el = $(elem);

        el.attr('id', uuid.v4() );

        let cell = $(`<div class="docable-cell docable-cell-${el.data('type')}">`);
        let overlay = $(`<div class="docable-cell-overlay">`);
    
        // overlay is parent to pre block
        el.wrap(overlay);
        // cell is parent to overlay
        overlay.wrap(cell);
    
        // add buttons
        let more_btn = 
        `<button class="docable-overlay-btn-reveal btn-more">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 560 560" id="more-icon-560" aria-hidden="true" class="option-menu">
        <path d="M350 280c0 38.634-31.366 70-70 70s-70-31.366-70-70 31.366-70 70-70 70 31.366 70 70m0-210c0 38.634-31.366 70-70 70s-70-31.366-70-70 31.366-70 70-70 70 31.366 70 70m0 420c0 38.634-31.366 70-70 70s-70-31.366-70-70 31.366-70 70-70 70 31.366 70 70"></path>
        </svg>
        </button>
        `;
        overlay.append(more_btn);
    
        if( executable )
        {
            let play_btn;
            if( el.data('type') === 'file' )
            {
                play_btn = `<button class="far fa-file docable-overlay-btn play-btn"></button>`
            }
            else if (el.data('type') === 'edit') 
            {
                play_btn = `<button class="far fa-edit docable-overlay-btn play-btn"></button>`
            }
            else
            {
                play_btn = `<button class="far fa-play-circle docable-overlay-btn play-btn"></button>`
            }
            overlay.append(play_btn);
        }
    
        // let copy_btn = `<button class="far fa-copy docable-overlay-btn copy-btn"></button>`;
        // overlay.append(copy_btn);
    
        // insert file docable-cell-file-header
        if( el.data('type') === 'file' )
        {
            $(`<div class="docable-cell-file-header">${el.data('path')}</div>`).insertBefore(overlay)
        }
    
        // insert sideannotation before pre block.
        $(`<div class="sideAnnotation">[${$(elem).data('type')}:]</div>`).insertBefore(overlay)
    
        // insert output block
        cell.append('<div class="docable-cell-output">');
    
        return cell;
    }

}

module.exports = new NotebookRender();