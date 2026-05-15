paper=open(r"刷題系統\data.txt","r",encoding="utf-8")
"""
encoding with utf-8 but when read red ff(wrong code) it return \x0c
if we error=ignore it will read all wrong, zero corrent
vscode output 有字數限制 ,可以output到一個檔案內

"""
lines=paper.read()#get paper , it reads like a normal txt file
#print(lines)
"""
we are going to built a data base
split each line by using split("\n") and then coutquer{
delete any line which has 'of 49'
if we see '電腦軟體應用 丙級 工作項目' on the line, create some object to each main question , and 

}
split each line by using split(") and then coutquer{

}


create some object to each main question and counquer all line to their object
counquer all line to their
split each line by using split("。")
"""
todelete=[]
mainquestion=[]
goal=lines.split("\n")
index=-1
for rs in lines.split("\n"):
    index+=1
    if 'of 49' in rs:
        todelete.append(index)
    if '電腦軟體應用 丙級 工作項目' in rs:
        mainquestion.append(index)
print(todelete)
print(mainquestion) 
hash1={}
hash2={}
data2=[]
print(paper.readline(40))

for rs in todelete:
    hash1[rs]=1
    print(goal[rs])
    print("delete")
for rs in mainquestion:
    hash2[rs]=1
    print(goal[rs])
    print("main question")

hashtable={}

index=-1
for rs in lines.split("\n"):
    index+=1
    if index in hash1 or index in hash2:
        continue
    data2.append(rs)
data3=("".join(data2)).split("。")
mainq=0
print("\n".join(data3))

lastnumber=-1
for rs in data3[:-1]:
    print(rs)
    number=rs.split(". (")[0]
    answer=rs.split(". (")[1][0]
    q1=rs.split(". (")[1][2:].split("①")[0].replace(" ", "")
    q2="①"+rs.split("①")[1].replace(" ", "")
    #if we split by "。", the last one will wrong, so we dont use the last
    #print(number,answer)
    #print(q1)
    #print(q2)
    #confirm if new main question
    if int(lastnumber)==-1 or int(number)<int(lastnumber):
        mainq+=1
    lastnumber=int(number)
    #using real main question number create hashtable
    #key is main question number + question number
    #value is list of q1 , q2 , answer
    
    hashtable[mainq*1000+int(number)]=[q1,q2,answer]
    #the problem is number sometimes is 1 some is 21 some is 123 , their length is different



print(hashtable.keys())

#code below this row is made by chat GPT, it help me save data in hashtable which is data base
path = r"刷題系統\imformation.txt"

with open(path, "w", encoding="utf-8") as f:
    f.write(str(hashtable))

print(f"資料已儲存到 {path}")