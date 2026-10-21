import sys
sys.path.insert(0,'.')
from PIL import Image
from species import SPECIES
import spritegen
ids=list(SPECIES)
cols=10; S=6
rowsN=(len(ids)+cols-1)//cols
img=Image.new('RGB',(cols*17*S,rowsN*18*S),'#b5c19a')
for k,i in enumerate(ids):
    name,stage,_,rec=SPECIES[i]
    rows,_=spritegen.render(dict(rec,stage=stage))
    ox=(k%cols)*17*S; oy=(k//cols)*18*S
    for y,r in enumerate(rows):
        for x,c in enumerate(r):
            if c=='X':
                for dx in range(S-1):
                    for dy in range(S-1): img.putpixel((ox+x*S+dx,oy+y*S+dy),(43,51,32))
img.save('/tmp/claude-0/-home-user/a4d74979-254e-57cc-b24c-57631c7d817e/scratchpad/sheet.png')
print(len(ids))
