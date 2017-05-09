
(function($) {

    var AppIdEditorValue = function(value) {
        this.appid = value[0] || null;
    };
    _.extend(AppIdEditorValue.prototype, {
        generateHTML: function() {
            return _.escape(this.appid||'(empty Application ID)');
        },
        attach: function(container) {},
        getValue: function(container) {
            return [this.appid];
        },
        undoableDeletedText: function(container) {
            return this.appid;
        }
    });

    Haplo.editor.registerTextType("hres:appid", function(value) {
        return new AppIdEditorValue(value);
    });

})(jQuery);
