def clear_line(line):
    def make_translation_table(punctuation='\'+:.,()!?«»""\n'):
        return {ord(i): '' for i in punctuation}

    return line.translate(make_translation_table())
