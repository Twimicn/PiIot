(function (W) {
    'use strict';

    function showAlert(el, msg, type, close) {
        var html = '<div class="alert alert-' + type + '">';
        if (close) {
            html += '<a href="#" class="close" data-dismiss="alert">&times;</a>';
        }
        html += '<strong>提示信息:</strong><a>' + msg + '</a></div>';
        $(el).html(html);
    }

    function Dialog(id, conf) {
        conf = conf || {};
        this._events = {};
        var that = this;
        var $dialog = $('#dialog_' + id);
        if ($dialog.length === 0) {
            $dialog = $('<div class="modal" id="dialog_' + id + '" tabindex="-1"' + (conf.staticBack ? ' data-backdrop="static"' : '') + ' role="dialog"></div>')
            $('body').append($dialog);
        }
        $dialog.html('<div class="modal-dialog' + (conf.center ? ' modal-dialog-centered' : '') + '" role="document"><div class="modal-content"></div></div>');
        var $content = $dialog.find('.modal-content');
        if (conf.header) {
            var header = '<div class="modal-header"><h5 class="modal-title">' + (conf.header.title || '') + '</h5>';
            if (conf.header.close) {
                header += '<button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>';
            }
            header += '</div>';
            $content.append(header);
        }
        this.$body = $('<div class="modal-body"></div>');
        if (conf.body) {
            this.$body.html(conf.body);
        }
        $content.append(this.$body);
        if (conf.ok !== undefined || conf.cancel !== undefined) {
            var footer = $('<div class="modal-footer"></div>');
            if (conf.ok !== undefined) {
                var $btnOk = $('<button type="button" class="btn btn-primary">' + conf.ok + '</button>');
                $btnOk.click(function () {
                    if (typeof that._events['ok'] === 'function') that._events['ok']();
                });
                footer.append($btnOk);
            }
            if (conf.cancel !== undefined) {
                var $btnCancel = $('<button type="button" class="btn btn-secondary" data-dismiss="modal">' + conf.cancel + '</button>');
                $btnCancel.click(function () {
                    if (typeof that._events['cancel'] === 'function') that._events['cancel']();
                });
                footer.append($btnCancel);
            }
            $content.append(footer);
        }
        this.$dialog = $dialog;
    }

    Dialog.prototype.body = function () {
        return this.$body;
    };

    Dialog.prototype.show = function () {
        this.$dialog.modal('show');
    };

    Dialog.prototype.hide = function () {
        this.$dialog.modal('hide');
        this.$dialog.hide();
    };

    Dialog.prototype.on = function (evtName, callback) {
        if (typeof callback === 'function') this._events[evtName] = callback;
    };

    function createDialog(id, conf) {
        return new Dialog(id, conf);
    }

    function tipBox(msg) {
        var dialog = new Dialog('tip', {
            body: msg,
        });
        dialog.show();
        return dialog;
    }

    function messageBox(title, msg) {
        var dialog = new Dialog('msg', {
            header: {
                title: title,
                close: true,
            },
            body: msg,
            ok: '确定',
            cancel: '取消',
        });
        dialog.show();
        return dialog;
    }

    function inputBox(title, msg) {
        var inputId = 'input_box_' + (new Date()).getTime();
        var dialog = new Dialog('msg', {
            header: {
                title: title,
                close: true,
            },
            body: '<p>' + msg + '</p>' + '<input id="' + inputId + '" type="text" class="form-control"/>',
            ok: '确定',
            cancel: '取消',
        });
        dialog.on('ok', function () {
            dialog.hide();
            if (typeof dialog._events['input'] === 'function') dialog._events['input']($('#' + inputId).val());
        });
        dialog.show();
        return dialog;
    }

    function loadingBox(msg, color) {
        color = color || 'primary';
        var html = '<div class="text-center mt-3"><div class="spinner-border text-' + color + '" role="status"><span class="sr-only">Loading...</span></div></div>';
        if (msg) {
            html += '<div class="text-center mt-3">' + msg + '</div>';
        }
        var dialog = new Dialog('loading', {
            staticBack: true,
            center: true,
            body: html,
        });
        dialog.show();
        return dialog;
    }

    function checkLogin() {
        var user = $.Eira.storage('user');
        if (user.token && (new Date(user.expire) > new Date())) {
            return true;
        } else {
            $.Eira.storage('user', null);
            $.Eira.navigate('login');
            return false;
        }
    }

    function logout() {
        $.Eira.storage('user', null);
        $.Eira.navigate('login');
    }

    function apiPost(path, data) {
        return $.ajax({
            url: $.Eira.data('apiUrl') + path,
            method: "POST",
            timeout: 0,
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data: $.extend({token: $.Eira.storage('user').token}, data),
        });
    }

    function apiUpload(path, data) {
        var postData = new FormData();
        $.each(data, function (k, v) {
            postData.append(k, v);
        });
        postData.append('token', $.Eira.storage('user').token);
        return $.ajax({
            url: $.Eira.data('apiUrl') + path,
            method: "POST",
            timeout: 0,
            processData: false,
            contentType: false,
            data: postData,
        });
    }

    W.Utils = {
        showAlert: showAlert,
        messageBox: messageBox,
        inputBox: inputBox,
        loadingBox: loadingBox,
        tipBox: tipBox,
        createDialog: createDialog,
        checkLogin: checkLogin,
        apiUpload: apiUpload,
        apiPost: apiPost,
        logout: logout,
    }
})(window);
