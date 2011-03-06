var fs = require('fs'),
    JobClass = require('node.io/job').JobClass,
    job = new JobClass(),
    assert = require('assert');

var dom = __dirname + '/resources/dom.html';

/* dom.html
<p class="a b" id="first"></p>
<p class="a"></p>
<p class="a b"></p>
<p class="b c">
    <p class="a" id="last"></p>
    <p class="d"></p>
</p>
<p class="f">
    &amp;foo
    <br />
    <p class="d">
        <br />
    </p>
    bar
    <b><i><br />More text</i></b>
</p>
<p id="x">
    <a class="child">foobar</a>
</p>
<div id="inner">
<script type="javascript">//I am some javascript</script>
<a href="test.html"></a>
<ul><li>1</li><li>2</li></ul>
<!-- comment.. -->
<style>//I am some style</style>
<input type="text" />
</div>
*/

module.exports = {

    'test #parseHtml()': function() {

        fs.readFile(dom, 'utf8', function(err, data) {
            if (err) throw err;

            job.parseHtml(data, function(err, $, data) {
                if (err) throw err;

                //Test a class selector
                assert.equal(4, $('p.a').length);

                //Provide a way to iterate over all selected elements
                var i = 0;
                $('p.a').each(function(elem) {
                    i++;
                    assert.ok(typeof elem.attribs === 'object');
                });
                assert.equal(4, i);

                //Provide a way to iterate over odd elements
                i = 0;
                $('p.a').odd(function(elem) {
                    i++;
                    assert.equal('a b', elem.attribs['class']);
                });
                assert.equal(2, i);

                //Provide a way to iterate over even elements
                i = 0;
                $('p.a').even(function(elem) {
                    i++;
                    assert.equal('a', elem.attribs['class']);
                });
                assert.equal(2, i);

                //Find p tags that have a descendant a tag
                var p = $('p').has('a');
                assert.equal(1, p.length);
                assert.equal('x', p.first().attribs['id']);

                //Optionally iterate over a certain attribute
                $('p.a').each('class', function(cls) {
                    assert.ok(typeof cls === 'string');
                });

                //Test ID selectors
                assert.equal('x', $('p#x').attribs.id);
                assert.equal('x', $('#x').attribs.id);

                //Test nested tags
                assert.equal(3, $('p p').length);

                //Test multiple class selectors
                assert.equal('b c', $('p.b.c').attribs['class']);

                //Test filter()
                assert.equal('b c', $('p.b').filter('.c').attribs['class']);

                //Test first() / last()
                assert.equal('first', $('p.a').first().attribs['id']);
                assert.equal('last', $('p.a').last().attribs['id']);

                //Test rawtext
                assert.equal('\r\n    &amp;foo\r\n    \r\n    bar\r\n    ', $('p.f').rawtext);

                //Test text getter - note: <br /> is replaced with \n and HTML entities are decoded
                assert.equal('&foo\nbar', $('p.f').text);

                //Test fulltext getter - fulltext recurses through child tags and adds their text
                assert.equal('&foo\n\nbar\nMore text', $('p.f').fulltext);

                //Test strip tags
                assert.equal('\r\n    &amp;foo\r\n    \r\n    bar\r\n    More text', $('p.f').striptags);

                var inner = '<div id="inner"><script type="javascript">//I am some javascript</script>'
                          + '<a href="test.html"></a>'
                          + '<ul><li>1</li><li>2</li></ul>'
                          + '<!-- comment.. -->'
                          + '<style>//I am some style</style>'
                          + '<input type="text" />'
                          + '</div>';

                //Test innerHTML getter
                assert.equal(inner, $('#inner').innerHTML);

                //Test child selectors
                assert.equal('child', $('#x .child').attribs['class']);
                assert.equal(1, $('#x').children.length);
                assert.equal('function', typeof $('#x').children.each);
                assert.equal('function', typeof $('#x').children.first);
                assert.equal('function', typeof $('#x').children.last);
                assert.equal('child', $('#x').children.filter('.child').attribs['class']);

                //All of these will fail
                assert.throws(function () {
                    $('#doesntexist');
                });
                assert.throws(function () {
                    $('.doesntexist');
                });
                assert.throws(function () {
                    $('p.a.b.c.d');
                });
                assert.throws(function () {
                    $('p.a').filter('.xyz');
                });
            });
        });
    },
}
