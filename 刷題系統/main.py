"""
here is some meaning of file name in folder data:
imformation = questions
did_not_finish = questions you have not finished
data = from PDF to txt, the tool is https://convertio.co/zh/pdf-txt/
note = fixed questions and your note

"""


import re
import random
import os
import ast


# main.py 
from gui_system import GUI 
# 初始化 GUI，預設 PyQt 
gui = GUI()


class exam():
    def __init__(self):
        self.data=[]
        self.useless_row=[]
        self.useful_data=[]
        self.right_data=[]
        self.question={}
        self.did_not_finish=[]
        self.wrong_question=[]
    @staticmethod
    def _get_data(name,to_data_type):
        path=chatgpt_count_the_file_path_in_data_folder(name)
        try:
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception:
            print("無法讀取檔案，請確認檔案路徑是否正確")
            print("程式結束")
            return False
        match to_data_type:
            case "list":
                return file_str_to_list(content)
            case "dict":
                return file_str_to_dict(content)
            case "str":
                return content
            case _:
                print("input error")
                print("list dict str")
                print("exit")
                return False
            
    def _ignore_useless_and_get_useful_data(self,ob:list,useless:list[0:2])->list:
        """corrent delete useless data in each row,like 'page 1 of 49' and '工作項目 一 ' or nothing in the row"""
        result=[]
        for rs in ob:
            if rs=="" or useless[0] in rs or useless[1] in rs:
                continue
            result.append(rs)
        if "" in result or useless[0] in result or useless[1] in result:
            print("fail delete useless")
            return False
        
        return result

    def _get_to_delete(self,ob):
        pass
    def _delete_useless(self):
        pass

    def _chatgpt_save(self,ob,file,append_or_write:str,join_last_row:bool):
        if len(ob)==0:
            print("nothing inside")
        #this function is made by chatGPT and me
        
        # 將 dict 轉成字串寫入檔案
        with open(chatgpt_count_the_file_path_in_data_folder(file), append_or_write, encoding="utf-8",errors="ignore") as f:
            f.write(str(ob))
            if join_last_row:
                f.write("\n")

    def _load(self,ob,data_type):
        result=[]
        with open(chatgpt_count_the_file_path_in_data_folder(ob), "r", encoding="utf-8",errors="ignore") as f:
            bot=f.read()
        match data_type:
            case "dict":
                return file_str_to_dict(bot)
            case "list":
                return file_str_to_list(bot)
            case "str":
                return bot
        return 0
    
    def _useful_data_to_right_data(self,ob:str)->list:
        """correct split way"""
        result=[]
        ob=ob.replace("\x0c","")
        haha=ob.split("。\n")
        
        index=-1
        for rs in haha:
            yesno=1
            index+=1
            try:
                int(rs[0])
            except:
                yesno=0
            if yesno==0:
                realq=result[-1]+"。\n"+rs
                result.pop(-1)
                result.append(realq)
            else:
                result.append(rs)
        return result
        """
        n-1  n
        bot
        bot=n-1+n (str+str)
        list.
        """
        """
        ob=[pe for pe in ob if pe!=""]
        result=ob
        me_with_last_join=[]
        index=-1
        my_last=False
        for rs in ob:
            index+=1
            next_first=rs[0]
            is_int=True
            try:
                int(next_first)
            except:
                is_int=False

            if my_last==False or my_last=="。" and is_int:
                pass
            else:
                
                #now in n 
                #see n and n-1 fuck up
                #me_with_last_join.append(n)
                
                me_with_last_join.append(index)
            
            my_last=rs[-1]


        for rs in me_with_last_join:
            result.insert(rs-1,result[rs-1]+result[rs])
            result.pop(rs)
            result.pop(rs)
        return result
        """

    def _right_data_to_question(self,ob:list):
        """as we have delete shit row,
        corrent split
        now we need to cheak a row 
        delete shit word
        .
        if we confirm did these, we can create questions"""
        result={}
        lastnumber=-1
        mainq=0
        for rs in ob:
            #thanks chatgpt tell me \n is one word but not 2 word
            rs=[pe for pe in rs if pe!="\n"]
            #rs=[pe for pe in rs if pe!=""]
            #rs=[re.sub(r' {2,}', '', pe) for pe in rs]#this row is made by chat gpt
            #rs=[pe for pe in rs if pe!=""]


            todo=rs
            rs=[]
            index=-1
            bad=0
            may_use=False
            for cheakspace in todo:
                index+=1
                if cheakspace==" ":
                    bad+=1
                    may_use=True
                else:
                    bad=0
                if bad>=2:
                    may_use=False
                if bad==0:
                    if may_use:
                        rs.append(" ")
                        may_use=False
                    rs.append(cheakspace)


            rs="".join(rs)
            number=rs.split(". (")[0]
            answer=get_correct_answer(rs.split(". (")[1])
            #answer=rs.split(". (")[1][0]
            q1=rs.split(". (")[1][len(answer)+1:].split("①")[0]
            if q1[0]==" ":
                q1=q1[1:]
            q2="①"+rs.split("①")[1]
            #if we split by "。", the last one will wrong, so we dont use the last
            #print(number,answer)
            #print(q1)
            #print(q2)
            #confirm if new main question
            if int(lastnumber)==-1 or int(number)<int(lastnumber):
                mainq+=1
            lastnumber=int(number)
            #using real main question number create rs.question
            #key is main question number + question number
            #value is list of q1 , q2 , answer
            
            result[mainq*1000+int(number)]=[q1,q2,answer]
            #the problem is number sometimes is 1 some is 21 some is 123 , their length is different
            print(result[mainq*1000+int(number)])

            """
            cheak if any wrong
            bot=int(input("繼續 1\n停下 2\n"))
            match bot:
                case 1:
                    pass
                case 2:
                    print("已停止")
                    return 0
            """
        return result


def split_q2(ob:str)->list:
    a1=ob.split("②")[0]
    a2=("②"+ob.split("②")[1]).split("③")[0]
    a3=("③"+("②"+ob.split("②")[1]).split("③")[1]).split("④")[0]
    a4="④"+("③"+("②"+ob.split("②")[1]).split("③")[1]).split("④")[1]
    return [a1,a2,a3,a4]


def set_to_str(ob):
    result=[]
    for rs in ob:
        result.append(rs)
    return "".join(result)


def get_correct_answer(string):
    result=set()#之後要判斷答案是不是全部一樣 set(123)=set(321)
    for rs in string:
        try:
            a=int(rs)
        except:
            return result
        result.add(str(a))
    return result

def file_str_to_dict(content):
    info_dict = ast.literal_eval(content)
    return info_dict


def file_str_to_list(content):
    info_list = ast.literal_eval(content)

    if not isinstance(info_list, list):
        raise TypeError(f"檔案內容不是 list:{type(info_list)}")

    return info_list


def chatgpt_get_my_path():
    #this function is made by chat GPT
    return os.path.abspath(__file__)
     
def chatgpt_count_the_file_path_in_data_folder(second_file):
    #chat gpt teach me \ should change to \\
    """bot=chatgpt_get_my_path().split("\\")
    bot.pop(-1)
    bot.append(second_file)
    以上我寫的  沒有跨平台性  只能在window跑
    """
    #以下chatgpt help
    tosplit=os.path.sep
    bot=chatgpt_get_my_path().split(tosplit)
    bot.pop(-1)
    bot.append("data")
    bot.append(second_file)
    return tosplit.join(bot)
    








def main(dnf,wrong_question_number,information):
    rs=exam()
    rs.question=rs._load(information,"dict")#print(rs.question)
    bot=input("新開始 1 \n接續之前題目 0\n")
    if int(bot)==1:
        number=list(rs.question.keys())
        print("新開始")
    elif int(bot)==0:
        number=rs._load(dnf,"list")
        print("接續之前題目")
    else:
        print("error")
        return 0
    wrongnumber=[]
    while len(number)>0:
        print("\n")
        ob=random.choice(number)
        number.remove(ob)
        print(rs.question[ob][0])
        for hahaha in split_q2(rs.question[ob][1]):
            print(hahaha)
        print("tell me the answer \n(if you wanna stop, type 'stop') \n(if you dont know the answer,type 0)")
        userinput=input()
        if userinput=="stop":
            break
        elif set(userinput)==(rs.question[ob][2]):
            print("correct")
        else:
            print("wrong")
            print("the answer is:",rs.question[ob][2])
            wrongnumber.append(str(ob))
        print("the question is  " + str(ob))
    print(wrongnumber)
    rs._chatgpt_save(("\n".join(wrongnumber)),wrong_question_number,"a",True)
    print("wrong question saved in "+chatgpt_count_the_file_path_in_data_folder(wrong_question_number))
    rs._chatgpt_save(number,dnf,"w",False)
    print("the question you did not finish saved in "+chatgpt_count_the_file_path_in_data_folder(dnf))

def fix_question(question,wrongnumber,note):
    rs=exam()
    rs.question=rs._load(question,"dict")
    #訂正錯題
    f=open(chatgpt_count_the_file_path_in_data_folder(wrongnumber),"r",encoding="utf-8")
    wrongnumber_list=f.read().split("\n")
    f.close()
    index=-1
    print(wrongnumber_list)
    wrongnumber_list=[rs for rs in wrongnumber_list if rs!="\n" and rs!=""]
    real_wrongnumber_list = list(wrongnumber_list)
    print(wrongnumber_list)
    for pe in wrongnumber_list:
        index+=1
        print("題號"+pe)
        print(rs.question[int(pe)][0])
        for hahaha in split_q2(rs.question[int(pe)][1]):
            print(hahaha)
        print(rs.question[int(pe)][2])
        bot=input('請寫下訂正(停止訂正請輸入 stop)\n換行請輸入" .."(半形空格+兩個半行英文句號)\n')
        if bot=="stop":
            break
        real_wrongnumber_list.remove(pe)
        rs._chatgpt_save(str(pe),note,"a",True)
        hahaha=rs.question[int(pe)]
        hahaha[1]=split_q2(hahaha[1])
        hahaha[-1]=set_to_str(hahaha[-1])
        #print(hahaha)
        #print("\n".join(hahaha))
        for question_data in hahaha:
            rs._chatgpt_save(question_data,note,"a",True)
        #rs._chatgpt_save("\n".join(hahaha),note,"a",True)
        #note.write("\n".join(rs.question[int(pe)]))
        #n.write("\n")
        if " .." in bot:
            bot2=bot.split(" ..")
            for ha in bot2:
                rs._chatgpt_save(ha,note,"a",True)
                #n.write(ha)
                #n.write("\n")
        else:
            rs._chatgpt_save(bot,note,"a",True)
            #n.write(bot)
            #n.write("\n")
        rs._chatgpt_save("\n\n",note,"a",True)
        #n.write("\n\n\n")
        print("\n")
    bot2=True
    if len(real_wrongnumber_list)==0:
        bot2=False
    rs._chatgpt_save("\n".join(real_wrongnumber_list),wrongnumber,"w",bot2)


def test(information):
    #print(dir(exam))
    #help(list.insert)
    #print(dir(set))
    """rs=exam()
    rs.question=rs._load(information,"dict")
    for pe in [2013,1248]:
        print(rs.question[pe])"""
    # 測試 input/print
    name = input("Enter your name:")
    print(f"Hello, {name}!")

    age = input("Enter your age:")
    print("Your age is", age)


def initialize(sub_file,ob_file,bad):
    rs=exam()
    rs.data=rs._get_data(sub_file,"str")#print(rs.data) success get data
    rs.useful_data=rs._ignore_useless_and_get_useful_data(rs.data.split("\n"),bad)
    rs.right_data=rs._useful_data_to_right_data("\n".join(rs.useful_data))
    rs.question=rs._right_data_to_question(rs.right_data)
    rs._chatgpt_save(rs.question,ob_file,"w",False)


which_exam=int(input("新增 add\n乙檢 1\n丙檢 2\n"))
print("\n")

"""
走訪2個檔案:
file_name.txt  存放dict  {檢定名稱:[[檔案們],[bad_word]]}
if nothing in the file_name.txt:
    現場寫一個dict
    放到file_name.txt
    print("nothing in the exam system\ninput 'add' to add")
"""
if which_exam==1:
    file=["data2.txt","did_not_finish2.txt","imformation2.txt","wrong_question_number2.txt","note2.txt"]
    bad=["of 64","電腦軟體應用 乙級 工作項目"]
elif which_exam==2:
    file=["data.txt","did_not_finish.txt","imformation.txt","wrong_question_number.txt","note.txt"]
    bad=["of 49","電腦軟體應用 丙級 工作項目"]

bot=int(input("main 1\nfix_question 2\ntest 3\ninitialize 0\n"))
match bot:
    case 1:
        main(file[1],file[3],file[2])
    case 2:
        fix_question(file[2],file[3],file[4])
    case 3:
        test(file[2])
    case 0:
        initialize(file[0],file[2],bad)
    case _:
        print("input error")
