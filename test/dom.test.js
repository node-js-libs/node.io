var fs = require('fs'),
    nodeio = require('../'),
    JobClass = nodeio.JobClass,
    job = new JobClass(),
    assert = require('assert');
    
var dom = __dirname + '/resources/dom.html';

/* dom.html
<p class="a b"></p>
<p class="a"></p>
<p class="a c"></p>
<p class="b c">
    <p class="a e"></p>
    <p class="d"></p>
</p>
<p class="f">
    foo
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
*/

module.exports = {
    
    'test #parseHtml()': function() {
        
        fs.readFile(dom, 'utf8', function(err, data) {
            if (err) throw err;
            
            job.parseHtml(data, function(err, $, data) {
                if (err) throw err;
                                
                //Test a class selector
                assert.equal(4, $('p.a').length);
                
                //Provide a way to iterate over the elements
                $('p.a').each(function(elem) {
                    assert.ok(typeof elem.attribs === 'object');
                });
                                
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
                assert.equal('a b', $('p.a.b').attribs['class']);
                
                //Test filter()
                assert.equal('a b', $('p.a').filter('.b').attribs['class']);
                                
                //Test first() / last()
                assert.equal('a b', $('p.a').first().attribs['class']);
                assert.equal('a e', $('p.a').last().attribs['class']);
                
                //Test text getter - note: <br /> is replaced with \n
                assert.equal('foo\nbar', $('p.f').text);
                
                //Test fulltext getter - fulltext recurses through child tags and adds their text
                assert.equal('foo\n\nbar\nMore text', $('p.f').fulltext);
                
                //Test child selectors
                assert.equal('child', $('#x .child').attribs['class']);
                assert.equal(1, $('#x').children.length);
                assert.equal('function', typeof $('#x').children.each);
                assert.equal('function', typeof $('#x').children.first);
                assert.equal('function', typeof $('#x').children.last);
                assert.equal('child', $('#x').children.filter('.child').attribs['class']);
                
                //Output_hook is called on fail
                job.output_hook = function() {
                    assert.ok(true, 'Selector fail as expected');
                }
                
                //All of these will fail
                assert.isUndefined($('#doesntexist'));
                assert.isUndefined($('.doesntexist'));
                assert.isUndefined($('p.a.b.c.d'));
                assert.isUndefined($('p.a').filter('.xyz'));
            });
        });
        
    }
    
}