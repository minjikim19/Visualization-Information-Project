var color = {
    "Games-Action": "#8dd3c7",
    "Games-Adventure": "#ffffb3",
    "Games-Fighting": "#bebada",
    "Games-Misc": "#fb8072",
    "Games-Platform": "#80b1d3",
    "Games-Puzzle": "#fdb462",
    "Games-Racing": "#b3de69",
    "Games-Role-Playing": "#feede5",
    "Games-Shooter": "#d9d9d9",
    "Games-Simulation": "#bc80bd",
    "Games-Sports": "#ccebc5",
    "Games-Strategy": "#ffed7f",
};

var transitioning, g1;
window.addEventListener('message', function(e) {
    var opts = e.data.opts,
        data = e.data.data;
    return main(opts, data);
});

var defaults = {
    margin: {top: 24, right: 0, bottom: 0, left: 0},
    rootname: "TOP",
    format: ",d",
    title: "",
    width: 1300,
    height: 800
};

function main(o, data) {
    var root,
        opts = $.extend(true, {}, defaults, o),
        formatNumber = d3.format(opts.format),
        rname = opts.rootname,
        margin = opts.margin,
        theight = 36 + 16;
    $('#chart').width(opts.width).height(opts.height);
    var width = opts.width - margin.left - margin.right,
        height = opts.height - margin.top - margin.bottom - theight,
        transitioning;
    var x = d3.scale.linear()
        .domain([0, width])
        .range([0, width]);

    var y = d3.scale.linear()
        .domain([0, height])
        .range([0, height]);

    var treemap = d3.layout.treemap()
        .children(function(d, depth) { return depth ? null : d._children; })
        .sort(function(a, b) { return a.value - b.value; })
        .ratio(height / width * 0.5 * (1 + Math.sqrt(5)))
        .round(false);

    var svg = d3.select("#chart").append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.bottom + margin.top)
        .style("margin-left", -margin.left + "px")
        .style("margin.right", -margin.right + "px")
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
        .style("shape-rendering", "crispEdges");

    var menu = svg.append("g")
        .attr("class", "menu");

    menu.append("rect")
        .attr("y", -margin.top)
        .attr("width", width)
        .attr("height", margin.top);

    menu.append("text")
        .attr("x", 6)
        .attr("y", 6 - margin.top)
        .attr("dy", ".75em");

    if (data instanceof Array) {
        root = { key: rname, values: data };
    } else {
        root = data;
    }
    initialize(root);
    accumulate(root);
    layout(root);
    display(root);

    if (window.parent !== window) {
        var myheight = document.documentElement.scrollHeight || document.body.scrollHeight;
        window.parent.postMessage({height: myheight}, '*');
    }

    function initialize(root) {
        root.x = root.y = 0;
        root.dx = width;
        root.dy = height;
        root.depth = 0;
    }

    function accumulate(d) {
        //console.log(d);
        return (d._children = d.values)
            ? d.value = d.values.reduce(function(p, v) { return p + accumulate(v); }, 0)
            : d.value;
    }

    function layout(d) {
        if (d._children) {
            treemap.nodes({_children: d._children});
            d._children.forEach(function(c) {
                c.x = d.x + c.x * d.dx;
                c.y = d.y + c.y * d.dy;
                c.dx *= d.dx;
                c.dy *= d.dy;
                c.parent = d;
                layout(c);
            });
        }
    }

    function display(d) {
        menu
            .datum(d.parent)
            .on("click", transition)
            .select("text")
            .text(setMenu(d));

        var g1 = svg.insert("g", ".menu")
            .datum(d)
            .attr("class", "path");

        var g = g1.selectAll("g")
            .data(d._children)
            .enter().append("g");

        g.filter(function(d) { return d._children; })
            .classed("children", true)
            .on("click", transition);

        var children = g.selectAll(".child")
            .data(function(d) { return d._children || [d]; })
            .enter().append("g");

        children.append("rect")
            .attr("class", "child")
            .call(rect)
            .append("title")
            .text(function(d) {
                //console.log(d);
                return d.key ? d.key + " (" + d.value + ")" : d.Name + " (" + d.value + ")"; });
        children.append("text")
            .attr("class", "ctext")
            .text(function(d) { return d.key; })
            .call(text2);

        g.append("rect")
            .attr("class", "parent")
            .call(rect);

        var t = g.append("text")
            .attr("class", "ptext")
            .attr("dy", ".75em")

        t.append("tspan")
            .text(function(d) { return d.key ? d.key : d.Name; });
        t.append("tspan")
            .attr("dy", "1.0em")
            .text(function(d) {
                return d.value + "M"; });
        t.call(text);

        g.selectAll("rect")
            .style("fill", function(d) {
                console.log(getKey(d));
                //console.log(color[getKey(d)]);
                return color[getKey(d)];
            });

        function transition(d) {
            if (transitioning || !d) return;
            transitioning = true;

            var g2 = display(d),
                t1 = g1.transition().duration(750),
                t2 = g2.transition().duration(750);

            // Update the domain only after entering new elements.
            x.domain([d.x, d.x + d.dx]);
            y.domain([d.y, d.y + d.dy]);

            // Enable anti-aliasing during the transition.
            svg.style("shape-rendering", null);

            // Draw child nodes on top of parent nodes.
            svg.selectAll(".path").sort(function(a, b) { return a.depth - b.depth; });

            // Fade-in entering text.
            g2.selectAll("text").style("fill-opacity", 0);

            // Transition to the new view.
            t1.selectAll(".ptext").call(text).style("fill-opacity", 0);
            t1.selectAll(".ctext").call(text2).style("fill-opacity", 0);
            t2.selectAll(".ptext").call(text).style("fill-opacity", 1);
            t2.selectAll(".ctext").call(text2).style("fill-opacity", 1);
            t1.selectAll("rect").call(rect);
            t2.selectAll("rect").call(rect);

            // Remove the old node when the transition is finished.
            t1.remove().each("end", function() {
                svg.style("shape-rendering", "crispEdges");
                transitioning = false;
            });
        }

        return g;
}

    function text(text) {
        text.selectAll("tspan")
            .attr("x", function(d) { return x(d.x) + 6; })
        text.attr("x", function(d) { return x(d.x) + 6; })
            .attr("y", function(d) { return y(d.y) + 6; })
            .style("opacity", function(d) { return this.getComputedTextLength() < x(d.x + d.dx) - x(d.x) ? 1 : 0; });
    }

    function text2(text) {
        text.attr("x", function(d) { return x(d.x + d.dx) - this.getComputedTextLength() - 6; })
            .attr("y", function(d) { return y(d.y + d.dy) - 6; })
            .style("opacity", function(d) { return this.getComputedTextLength() < x(d.x + d.dx) - x(d.x) ? 1 : 0; });
    }

    function rect(rect) {
        rect.attr("x", function(d) { return x(d.x); })
            .attr("y", function(d) { return y(d.y); })
            .attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
            .attr("height", function(d) { return y(d.y + d.dy) - y(d.y); });
    }

    function setMenu(d) {
        return d.parent
            ? setMenu(d.parent) + " / " + d.key + " (" + d.value + "M)"
            : d.key + " (" + d.value + "M)";
    }
}

if (window.location.hash === "") {
    console.log("hi");
    d3.json("data/dataset.json", function(err, res) {
        if (!err) {
            //console.log(res);
            var data = d3.nest().key(function(d) { return d.Genre; }).key(function(d) { return d.Publisher; }).key(function(d) { return d.Platform; }).entries(res);
            console.log(data);
            for(let i in data) {
                let key = "Games-" + data[i].key;
                formColor(data[i].values, key, color[key]);
            }
            main({title: "Game Sales"}, {key: "Games", values: data});
        }
    });
}

function formColor(d, p, col) {
    //console.log(d);
        for(let i of d) {
            let newKey = i.value == null ? p + "-" + i.key : p + "-" + i.Name;
            //console.log(newKey);
            // let newCol = color[p]'
            col = parseInt(col.slice(1), 16) + 10;
            col = "#" + col.toString(16);
            //console.log(newKey);
            color[newKey] = col;
            //console.log(color);
            // not last level
            if(i.value == null) {
                formColor(i.values, newKey, col);
            }
        }
}

function getKey(d) {

    return d.parent
        ? d.key ? getKey(d.parent) + "-" + d.key : getKey(d.parent) + "-" + d.Name
        : d.key;
}