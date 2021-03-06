# -*- coding: utf-8 -*-
import os
import time
import signal

from tg import config
from tg import require
from tg import response
from tg.controllers.util import abort
from tg.appwrappers.errorpage import ErrorPageApplicationWrapper \
    as BaseErrorPageApplicationWrapper

from tracim.lib.base import logger
from webob import Response
from webob.exc import WSGIHTTPException


def exec_time_monitor():
    def decorator_func(func):
        def wrapper_func(*args, **kwargs):
            start = time.time()
            retval = func(*args, **kwargs)
            end = time.time()
            logger.debug(func, 'exec time: {} seconds'.format(end-start))
            return retval
        return wrapper_func
    return decorator_func


class SameValueError(ValueError):
    pass


def replace_reset_password_templates(engines):
    try:
        if engines['text/html'][1] == 'resetpassword.templates.index':
            engines['text/html'] = (
                'mako',
                'tracim.templates.reset_password_index',
                engines['text/html'][2],
                engines['text/html'][3]
            )

        if engines['text/html'][1] == 'resetpassword.templates.change_password':
            engines['text/html'] = (
                'mako',
                'tracim.templates.reset_password_change_password',
                engines['text/html'][2],
                engines['text/html'][3]
            )
    except IndexError:
        pass
    except KeyError:
        pass


@property
def NotImplemented():
    raise NotImplementedError()


def add_signal_handler(signal_id, handler) -> None:
    """
    Add a callback attached to python signal.
    :param signal_id: signal identifier (eg. signal.SIGTERM)
    :param handler: callback to execute when signal trig
    """
    def _handler(*args, **kwargs):
        handler()
        signal.signal(signal_id, signal.SIG_DFL)
        os.kill(os.getpid(), signal_id)  # Rethrow signal

    signal.signal(signal_id, _handler)


class APIWSGIHTTPException(WSGIHTTPException):
    def json_formatter(self, body, status, title, environ):
        if self.comment:
            msg = '{0}: {1}'.format(title, self.comment)
        else:
            msg = title
        return {
            'code': self.code,
            'msg': msg,
            'detail': self.detail,
        }


class api_require(require):
    def default_denial_handler(self, reason):
        # Add code here if we have to hide 401 errors (security reasons)

        abort(response.status_int, reason, passthrough='json')


class ErrorPageApplicationWrapper(BaseErrorPageApplicationWrapper):
    # Define here response code to manage in APIWSGIHTTPException
    api_managed_error_codes = [
        400, 401, 403, 404,
    ]

    def __call__(self, controller, environ, context) -> Response:
        # We only do ou work when it's /api request
        # TODO BS 20161025: Look at PATH_INFO is not smart, find better way
        if not environ['PATH_INFO'].startswith('/api'):
            return super().__call__(controller, environ, context)

        try:
            resp = self.next_handler(controller, environ, context)
        except:  # We catch all exception to display an 500 error json response
            if config.get('debug', False):  # But in debug, we want to see it
                raise
            return APIWSGIHTTPException()

        # We manage only specified errors codes
        if resp.status_int not in self.api_managed_error_codes:
            return resp

        # Rewrite error in api format
        return APIWSGIHTTPException(
            code=resp.status_int,
            detail=resp.detail,
            title=resp.title,
            comment=resp.comment,
        )


def get_valid_header_file_name(file_name: str) -> str:
    """
    :param file_name: file name to test
    :return: Return given string if compatible to header encoding, or
    download.ext if not.
    """
    try:
        file_name.encode('iso-8859-1')
        return file_name
    except UnicodeEncodeError:
        split_file_name = file_name.split('.')
        if len(split_file_name) > 1:  # If > 1 so file have extension
            return 'download.{0}'.format(split_file_name[-1])
        return 'download'
