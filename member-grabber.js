// ==UserScript==
// @name         Facebook Group Grabber
// @namespace    http://tampermonkey.net/
// @version      0.3
// @description  Grabs group members in CSV format or group posts as zipped JSON files. Run either on the members list page of a group or the main page of a group. Client side script as Facebook have heavily restricted their graph API after the whole Cambridge Analytica scandal.
// @author       Mark Metcalfe
// @include      *.facebook.com/groups/*
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/jszip@3.2.2/dist/jszip.min.js
// ==/UserScript==

var totalGrabbed = 0;
var counter = 0;
var zip = new JSZip();
function scroll(){
  let before_height = document.body.scrollHeight;
  window.scrollTo(0,before_height);
  setTimeout(function(){
    if (counter == -1) return;
    scroll();
    let members = document.getElementById("groupsMemberSection_recently_joined");
    if (members == null)
      members = document.getElementById("groupsMemberSection_all_members");
    let have_more = members.querySelector(".uiMorePager");
    if(document.body.scrollHeight > before_height){
      counter = 0;
      let children = document.querySelectorAll('[data-name="GroupProfileGridItem"]');
      let grabbed = children.length;
      if(grabbed>totalGrabbed){
        totalGrabbed = grabbed;
        document.getElementById('this_export_main_ui_grabbed_count').innerHTML = totalGrabbed;
      }
    }
    if (have_more == null) {
      console.log("Grabbing");
      counter = -1;
      grab();
    }
  }, 500);
}

function grab(){
  let children = document.querySelectorAll('[data-name="GroupProfileGridItem"]');
  let errors = 0;
  let users = {};
  for (let i = 0; i < children.length; i++) {
    let div = children[i];
    let child = div.children[0];
    try {
      let profileId = /member_id=([0-9]+)/gi.exec(child.getAttribute('ajaxify'))[1];
      let name = child.children[0].getAttribute('aria-label');
      let joined = div.querySelector("abbr.timestamp");
      if (joined == null)
        joined = ""
      else
        joined = joined.children[0].innerHTML;
      let url = child.href;
      if(url.contains('/profile.php?'))
        url = '';
      else
        url = /facebook.com\/(.[^?]+)/gi.exec(url)[1];
      users[profileId] = [profileId,name,url,joined];
    } catch(err) {
      console.log(err);
      errors += 1;
    }
  }
  finishedUI(users, errors);
}

function getCSV(users){
  let data = 'id,name,username,joined,\n';
  let user_list = [];
  for(let id in users) user_list.push(users[id]);
  for(let i=0; i<user_list.length; i++){
    let user = user_list[i];
    data += user[0]+',"'+user[1]+'",'+user[2]+','+user[3];
    if(i<user_list.length-1) data += ',\n';
  }

  let group_name = document.getElementById('seo_h1_tag').children[0].innerText;
  group_name = group_name.split(' ').join('_');
  let filename = group_name+'-members-'+Date.now()+'.csv';

  let file = new Blob([data], {type: 'text/csv'});
  let a = document.createElement("a"), url = URL.createObjectURL(file);
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(function() {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      document.getElementById("this_export_main_ui").classList.add("fadeable","fadehide");
      setTimeout(function(){
        document.getElementById("this_export_main_ui").style.cssText = 'display:none';
      }, 1500);
  }, 0);
}

function finishedUI(users, errors){
  window.scrollTo(0,0);
  document.getElementById('this_export_bg_hide').style.cssText = 'display:none';
  let ui = document.getElementById('this_export_main_ui');
  ui.innerHTML = '<h1 style="font-size: 25px">Done!</h1><div style="font-size:1.3em; margin:5px 0">Successfully got '+Object.keys(users).length+' members, with '+errors+' errors.</div>' +
  '<div>Errors generally occur when there are deleted accounts or linked pages in the list.</div>'+
  '<div id="this_export_main_ui_download"></div>';
  let btn = document.createElement('a');
  btn.id = "this_export_list_btn_2";
  btn.classList.add("this_export_list_btn");
  btn.classList.add('_42ft', '_4jy0', '_4jy3', '_517h', '_51sy');
  btn.onclick = function(){ getCSV(users) };
  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path fill="#616770" d="M224 136V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V160H248c-13.2 0-24-10.8-24-24zm76.45 211.36l-96.42 95.7c-6.65 6.61-17.39 6.61-24.04 0l-96.42-95.7C73.42 337.29 80.54 320 94.82 320H160v-80c0-8.84 7.16-16 16-16h32c8.84 0 16 7.16 16 16v80h65.18c14.28 0 21.4 17.29 11.27 27.36zM377 105L279.1 7c-4.5-4.5-10.6-7-17-7H256v128h128v-6.1c0-6.3-2.5-12.4-7-16.9z"></path></svg><span>Save List</span>';
  document.getElementById("this_export_main_ui_download").appendChild(btn);
}

function showUI(){
  let hide_bg = document.createElement('div');
  hide_bg.id = 'this_export_bg_hide';
  document.body.appendChild(hide_bg);

  let ui = document.createElement('div');
  ui.id = 'this_export_main_ui';
  ui.innerHTML = '<h1 style="font-size: 25px">Grabbing List</h1><div>Grabbed <span id="this_export_main_ui_grabbed_count"></span> so far</div>';
  document.body.appendChild(ui);
}

async function btnMembersClick(){
  document.getElementById("this_export_list_btn_1").style.cssText = 'display:none';
  showUI();
  scroll();
}
async function dlzip(){
  let blo = await zip.generateAsync({type: 'blob'});
  let a = document.createElement('a');
  a.setAttribute('download', 'dl.zip');
  a.href = URL.createObjectURL(blo);
  document.body.appendChild(a);
  a.click();
}
function user_id_from_hovercard(hovercard){
  let urlsp = new URLSearchParams(hovercard.split('?')[1]);
  return parseInt(urlsp.get('id'));
}
function sleep(sec) {
  return new Promise(resolve => setTimeout(resolve, Math.floor(sec*1000)));
}
async function parse_comment(el, zip, depth){
  let avatar = el.querySelector('div.lfloat');
  if (avatar == null) return;
  let c = new Object();
  c.depth = depth;
  c.author_name = avatar.children[0].children[0].alt;
  c.author_id = user_id_from_hovercard(avatar.children[0].getAttribute('data-hovercard'));
  let content_span = el.querySelector('span[dir="ltr"]');
  if (content_span)
    c.content = content_span.textContent;
  let img_a = el.querySelector('a[rel="theater"]');
  if (img_a){
    let img_url = img_a.querySelector('img').getAttribute('src');
    c.img = await add_img_to_zip(img_url, zip);
  }
  // TODO get videos
  return c;
}
async function add_img_to_zip(img_url, zip){
  let img_surl = new URL(img_url);
  let path_elements = img_surl.pathname.split('/');
  let img_fname = path_elements[path_elements.length - 1];
  let img_response = await fetch(img_url);
  zip.file('img/' + img_fname, img_response.blob());
  return img_fname;
}
async function scroll_more(){
  let before_height = document.body.scrollHeight;
  window.scrollTo(0, 0);
  window.scrollTo(0, before_height);
  let counter = 0;
  while (true){
    await sleep(0.1);
    if (document.body.scrollHeight > before_height)
      return;
    counter++;
    if (counter > 300){
      console.warn('Scrolldown timeout');
      return;
    }
  }
}
function set_status_text(txt){
  let fbgg_status = document.getElementById('fbgg_status');
  fbgg_status.innerHTML = txt;
}
async function btnPostsClick(){
  document.getElementById("this_export_list_btn_1").style.cssText = 'display:none';
  let done = () => {
    let pgp = document.getElementById('pagelet_group_pager');
    if (pgp.querySelector('.groupsStreamMemeberBox'))
      return true;
    return false;
  };
  let pn = 0;
  addStatus();
  while (!done()){
    let ca = document.getElementById('contentArea');
    if (ca == null) throw Error('contentArea missing');
    let posts = ca.querySelectorAll('[role="article"][id]'); // has attributes role and id
    for (let i=0; i<posts.length; i++){
      let post = posts[i];
      // clicking on "See More" buttons
      let see_more_buttons = post.querySelectorAll('a');
      for (let see_more_btn of see_more_buttons){
        if (see_more_btn.innerText == 'See More'){
          see_more_btn.click();
        }
      }
      let p = new Object();
      // grab author
      let user_anchor = post.querySelector('[data-hovercard]');
      p.author_name = user_anchor.getAttribute('title');
      p.author_id = user_id_from_hovercard(user_anchor.getAttribute('data-hovercard'));
      // grab content
      let content = post.querySelector('.userContent');
      if (content) p.content = content.innerText;
      // grab images
      for (let img_a of post.querySelectorAll('a[rel="theater"][data-plsi]')){
        let img_url = img_a.getAttribute('data-plsi');
        let img_fname = await add_img_to_zip(img_url, zip);
        if (!p.images)
          p.images = [];
        p.images.push({filename: img_fname});
        // TODO add comments, download images if there are more than 5 of them
      }
      // grab created (unixtime)
      let ucw = post.querySelector('.userContentWrapper');
      let u0 = ucw.children[0]; // post content only, without comments
      // let u1 = ucw.children[1]; // comments section, starting with reactions zone
      let abbr = u0.querySelectorAll('abbr[data-utime]');
      p.created = parseInt(abbr[0].getAttribute('data-utime'));
      // grab id
      let href_elements = abbr[0].parentNode.getAttribute('href').replace(/\/$/, '').split('/');
      p.id = parseInt(href_elements[href_elements.length-1]);
      // grab original post URL
      if (abbr.length>1)
        p.orig_post = abbr[1].parentNode.getAttribute('href');
      // == comments below ==
      // click over more comments
      let comments_area = post.querySelector('form.commentable_item'); // or u1
      for(let btn of comments_area.querySelectorAll('a[role="button"]')){
        let btxt = btn.textContent;
        if (btxt.match(/^View \d+ more comments?$/) || btxt.match(/\d+ Repl(ies|y)/)){
          btn.click();
          for(let ii=0; ii<300; ii++){
            if (btn.parentNode.parentNode == null) // button detached
              break;
            await sleep(0.1);
            if (ii == 299)
              console.warn('timeout waiting for comments or replies');
          }
        }
      }
      // gather comments
      let comment_ul = comments_area.querySelector('ul');
      if (comment_ul){
        p.comments = [];
        for(let lead of comment_ul.children){
          let comment = await parse_comment(lead, zip, 0);
          if (comment)
            p.comments.push(comment);
          for(let subcomment of lead.querySelectorAll('li')){
            let comment = await parse_comment(subcomment, zip, 1);
            if (comment)
              p.comments.push(comment);
          }
        }
      } else {
        p.comments_disabled = true;
      }
      // we got all we want
      zip.file(p.id + '_post.json', JSON.stringify(p));
      pn++;
      post.remove(); // free up memory in the browser
      set_status_text(`grabbed ${pn} posts`);
    }
    console.log('end of iteration; posts number is ' + pn);
    // scrolling even more
    if (done())
      break;
    await scroll_more();
  }
  addBtn(dlzip, 'Download ZIP');
}
function addBtn(callback, buttonText){
  let btn = document.createElement('a');
  btn.id = 'this_export_list_btn_1';
  btn.classList.add('this_export_list_btn');
  btn.classList.add('_42ft', '_4jy0', '_4jy3', '_517h', '_51sy');
  btn.onclick = callback;
  btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 576 512"><path fill="#616770" d="M384 121.9c0-6.3-2.5-12.4-7-16.9L279.1 7c-4.5-4.5-10.6-7-17-7H256v128h128v-6.1zM192 336v-32c0-8.84 7.16-16 16-16h176V160H248c-13.2 0-24-10.8-24-24V0H24C10.7 0 0 10.7 0 24v464c0 13.3 10.7 24 24 24h336c13.3 0 24-10.7 24-24V352H208c-8.84 0-16-7.16-16-16zm379.05-28.02l-95.7-96.43c-10.06-10.14-27.36-3.01-27.36 11.27V288H384v64h63.99v65.18c0 14.28 17.29 21.41 27.36 11.27l95.7-96.42c6.6-6.66 6.6-17.4 0-24.05z"></path></svg><span>'+buttonText+'</span>';
  document.body.appendChild(btn);
}
function addStatus(){
  let status = document.createElement('div');
  status.id = 'fbgg_status';
  status.classList.add('_42ft', '_4jy0', '_4jy3', '_517h', '_51sy');
  document.body.appendChild(status);
}
function init(){
  let style = document.createElement('style');
  style.type = 'text/css';
  let css =
  '#this_export_main_ui { background-color: rgb(233, 235, 238); color: rgb(29, 33, 41); padding: 30px; position: fixed; left: 50%; top: 50%; text-align:center; '+
  'z-index: 99999; transform: translateX(-50%) translateY(-50%); border: 1px solid #dddfe2; border-radius: 4px; box-shadow: 0px 0px 20px 12px rgba(0, 0, 0, 0.33)}' +
  '#this_export_list_btn_1 { position: fixed; bottom: 20px; left: 20px;   }' +
  '#fbgg_status { position: fixed; bottom: 100px; left: 20px; }' +
  '#this_export_list_btn_2 { margin-top: 10px  }' +
  '.this_export_list_btn { font-size: 1.2em; z-index:99997  }' +
  '.this_export_list_btn svg { position: relative; width: 20px; margin: 5px; padding: 5px; bottom: 1px; vertical-align: middle;  }' +
  '.this_export_list_btn span { margin-right:5px  }' +
  '#this_export_bg_hide { position:fixed; top:0; left:0; width:100%; height:100%; margin:0; padding:0; z-index:99998; background-color:#000; opacity:0.85  }' +
  '#this_export_main_ui { position: fixed; left: 50%; top: 50%; transform: translateX(-50%) translateY(-50%); -moz-transform: translateX(-50%) translateY(-50%);'+
  '-webkit-transform: translateX(-50%) translateY(-50%); padding: 30px; z-index: 99999; background-color: rgb(233, 235, 238); '+
  'color: rgb(29, 33, 41); border: 1px solid #dddfe2; border-radius: 4px;  }' +
  '.fadeable { transition: opacity 1.5s; -moz-transition: opacity 1.5s; -webkit-transition: opacity 1.5s; }'
  '.fadehide { opacity: 0; }'
  ;
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);
}
function check_needed(){
  console.clear();
  if (document.location.pathname.match(/\/groups\/[^/]*\/members/) != null){
    init();
    addBtn(btnMembersClick, 'Export Member List');
  }
  else if (document.location.pathname.match(/\/groups\/[^/]+/) != null){
    init();
    addBtn(btnPostsClick, 'Export Group Posts');
  }
}
check_needed();
