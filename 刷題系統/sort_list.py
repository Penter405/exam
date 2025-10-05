#這也許是個可以新增的功能
#可以sort note.txt  wrong_question_number.txt的data
def sort(a_list,bigfirst):
    a_list.sort(reverse=bigfirst)
    return a_list

with open(r'刷題系統\wrong_question_number.txt','r',encoding='utf-8',errors="ignore") as f:
    bot=f.read().split('\n')
    bot=[rs for rs in bot if rs!='']
    print(sort(bot,False))
    print(len(bot))

print("總共767題")