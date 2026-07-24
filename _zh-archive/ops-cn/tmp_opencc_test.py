# -*- coding: utf-8 -*-
from opencc import OpenCC
cc=OpenCC('s2t')
text='命理知识库'
out=cc.convert(text)
print([hex(ord(c)) for c in out])
