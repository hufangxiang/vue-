function Compile(el, vm) {
    this.vm = vm;
    this.el = document.querySelector(el);
    this.fragment = null;
    this.init();
}

Compile.prototype = {
    init: function () {
        if (this.el) {
            this.fragment = this.nodeToFragment(this.el);
            this.compileElement(this.fragment);
            this.el.appendChild(this.fragment);
        } else {
            console.log('Dom元素不存在');
        }
    },
    nodeToFragment: function (el) {
        var fragment = document.createDocumentFragment();
        var child = el.firstChild;
        while (child) {
            // 将Dom元素移入fragment中
            fragment.appendChild(child);
            child = el.firstChild
        }
        return fragment;
    },
    // 模板解析，初始化，添加订阅者
    compileElement: function (el) {
        var childNodes = el.childNodes;
        var self = this;
        [].slice.call(childNodes).forEach(function(node) {
            var reg = /\{\{(.*)\}\}/;
            var text = node.textContent;

            if (self.isElementNode(node)) {  // 元素节点
                self.compile(node);
            } else if (self.isTextNode(node) && reg.test(text)) {
                self.compileText(node, reg.exec(text)[1]);
            }
            // 递归解析
            if (node.childNodes && node.childNodes.length) {
                self.compileElement(node);
            }
        });
    },
    compile: function(node) {
        var nodeAttrs = node.attributes;
        var self = this;
        Array.prototype.forEach.call(nodeAttrs, function(attr) {
            var attrName = attr.name;
            if (self.isDirective(attrName)) {
                var exp = attr.value;
                var dir = attrName.substring(2);
                if (self.isEventDirective(dir)) {  // 事件指令
                    self.compileEvent(node, self.vm, exp, dir);
                } else {  // v-model 指令
                    self.compileModel(node, self.vm, exp, dir);
                }
                node.removeAttribute(attrName);
            }
        });
    },
    // {{}} 指定的解析，初始化，添加订阅者
    compileText: function(node, exp) {
        var self = this;
        var initText = this.vm[exp];
        this.updateText(node, initText);
        new Watcher(this.vm, exp, function (value) {
            self.updateText(node, value);
        });
    },
    // 解析事件绑定指令，添加事件绑定
    compileEvent: function (node, vm, exp, dir) {
        var eventType = dir.split(':')[1];
        var cb = vm.methods && vm.methods[exp];

        if (eventType && cb) {
            node.addEventListener(eventType, cb.bind(vm), false);
        }
    },
    // v-model的数据双向绑定，初始化，添加订阅者
    compileModel: function (node, vm, exp, dir) {
        var self = this;
        var val = this.vm[exp];
        // 初始化v-model绑定的input值
        this.modelUpdater(node, val);
        // 添加一个订阅者：观察到数据变化时，更新视图view  默认（value）
        new Watcher(this.vm, exp, function (value) {
            self.modelUpdater(node, value);
        });
        // view视图监听到事件,更新数据 （默认input）
        node.addEventListener('input', function(e) {
            var newValue = e.target.value;
            if (val === newValue) {
                return;
            }
            self.vm[exp] = newValue;
            val = newValue;
        });
    },
    // 更新普通HTML元素的文本内容
    updateText: function (node, value) {
        node.textContent = typeof value == 'undefined' ? '' : value;
    },
    // 更新输入框元素的文本内容
    modelUpdater: function(node, value, oldValue) {
        node.value = typeof value == 'undefined' ? '' : value;
    },
    // 判断是否是v的指令
    isDirective: function(attr) {
        return attr.indexOf('v-') == 0;
    },
    // 判断是否是事件指令
    isEventDirective: function(dir) {
        return dir.indexOf('on:') === 0;
    },
    // 元素节点
    isElementNode: function (node) {
        return node.nodeType == 1;
    },
    // 文本节点
    isTextNode: function(node) {
        return node.nodeType == 3;
    }
}
